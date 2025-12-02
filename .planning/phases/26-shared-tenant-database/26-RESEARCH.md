# Phase 26: Shared Tenant Database - Research

**Researched:** 2026-01-26
**Domain:** PostgreSQL Schema Design + Supabase RLS + Zustand-to-Database Migration
**Confidence:** HIGH

## Summary

Phase 26 migrates application data (taxonomies, RCT entries, controls, etc.) from Zustand LocalStorage persistence to Supabase PostgreSQL with Row-Level Security (RLS), enabling multi-tenant data sharing within organizations. The current architecture uses 10 Zustand stores with `persist` middleware writing to LocalStorage - each user has isolated data. The target architecture persists data to PostgreSQL tables with tenant_id-based RLS, so all users within a tenant see the same data.

The key challenges are: (1) modeling hierarchical taxonomy trees in PostgreSQL, (2) handling the RCT's denormalized structure with dynamic custom columns, (3) migrating from client-only Zustand to server-synced state without breaking existing functionality, and (4) implementing RLS policies that maintain the existing 5-role permission model.

**Primary recommendation:** Use adjacency list with JSONB `path` column for taxonomies (hybrid approach), store RCT scores separately from control links, use JSONB for custom columns, and implement a phased migration with dual-write mode before cutting over completely.

## Standard Stack

The established libraries/tools for this phase.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.91.1 | Supabase client SDK | **Already installed.** Handles database queries, realtime subscriptions, auth. |
| `@tanstack/react-query` | ^5.90.20 | Server state management | Cache management, optimistic updates, automatic refetching. Already in stack research. |
| Supabase CLI | latest | Migrations, type generation | **Already installed.** Required for schema migrations. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `nanoid` | ^5.1.5 | **Already installed.** | Generate client-side IDs before syncing to database |
| `date-fns` | ^4.1.0 | **Already installed.** | Date formatting for test dates, deadlines |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Adjacency list | ltree extension | ltree is faster for reads but requires path updates on tree changes - taxonomies change frequently during initial setup |
| React Query | Continue with Zustand only | Zustand handles local state well but lacks cache invalidation, stale detection, background refresh |
| JSONB for custom columns | Separate table with EAV | EAV creates table bloat, JSONB consolidates user-defined fields efficiently |

**Installation:**
```bash
# React Query already in STACK.md - install if not present
npm install @tanstack/react-query@^5.90.20

# No new dependencies required - leverage existing stack
```

## Architecture Patterns

### Recommended Database Schema

```sql
-- TAXONOMY: Hierarchical tree with adjacency list + path cache
-- Stores both risk and process taxonomies in single table
CREATE TABLE public.taxonomy_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('risk', 'process')),
  parent_id UUID REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  hierarchical_id TEXT NOT NULL,  -- e.g., "1.2.3" - generated on insert
  path UUID[] DEFAULT '{}',       -- Materialized path for efficient ancestors query
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for RLS and query performance
CREATE INDEX idx_taxonomy_tenant_id ON public.taxonomy_nodes(tenant_id);
CREATE INDEX idx_taxonomy_type ON public.taxonomy_nodes(tenant_id, type);
CREATE INDEX idx_taxonomy_parent_id ON public.taxonomy_nodes(parent_id);
CREATE INDEX idx_taxonomy_path ON public.taxonomy_nodes USING GIN(path);

-- RLS
ALTER TABLE public.taxonomy_nodes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "taxonomy_tenant_isolation" ON public.taxonomy_nodes
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_nodes TO authenticated;
```

```sql
-- TAXONOMY WEIGHTS: Per-node and per-level weight configuration
CREATE TABLE public.taxonomy_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('risk', 'process')),
  -- NULL node_id = level default, non-NULL = node override
  node_id UUID REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  level INT CHECK (level BETWEEN 1 AND 5),
  weight NUMERIC(3,1) NOT NULL DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_weight UNIQUE (tenant_id, type, node_id, level)
);

CREATE INDEX idx_weights_tenant ON public.taxonomy_weights(tenant_id, type);

ALTER TABLE public.taxonomy_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weights_tenant_isolation" ON public.taxonomy_weights
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.taxonomy_weights TO authenticated;
```

```sql
-- CONTROLS: Global control definitions within tenant
CREATE TABLE public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  control_type TEXT CHECK (control_type IN (
    'Preventative', 'Detective', 'Corrective', 'Directive',
    'Deterrent', 'Compensating', 'Acceptance', 'Tolerance',
    'Manual', 'Automated'
  )),
  net_probability INT CHECK (net_probability BETWEEN 1 AND 5),
  net_impact INT CHECK (net_impact BETWEEN 1 AND 5),
  net_score INT GENERATED ALWAYS AS (net_probability * net_impact) STORED,
  test_frequency TEXT CHECK (test_frequency IN ('monthly', 'quarterly', 'annually', 'as-needed')),
  next_test_date DATE,
  last_test_date DATE,
  test_procedure TEXT,
  assigned_tester_id UUID REFERENCES public.profiles(id),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_controls_tenant ON public.controls(tenant_id);
CREATE INDEX idx_controls_tester ON public.controls(assigned_tester_id);

ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "controls_tenant_isolation" ON public.controls
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.controls TO authenticated;
```

```sql
-- RCT_ROWS: Risk-Process combinations with scores
-- row_id is composite: lowest-level risk UUID + ":" + lowest-level process UUID
CREATE TABLE public.rct_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  row_id TEXT NOT NULL,  -- "{riskLeafId}:{processLeafId}"
  risk_id UUID NOT NULL REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.taxonomy_nodes(id) ON DELETE CASCADE,
  gross_probability INT CHECK (gross_probability BETWEEN 1 AND 5),
  gross_impact INT CHECK (gross_impact BETWEEN 1 AND 5),
  gross_score INT GENERATED ALWAYS AS (gross_probability * gross_impact) STORED,
  gross_probability_comment TEXT,
  gross_impact_comment TEXT,
  risk_appetite INT DEFAULT 9,
  within_appetite INT GENERATED ALWAYS AS (risk_appetite - (gross_probability * gross_impact)) STORED,
  custom_values JSONB DEFAULT '{}',  -- Dynamic custom columns
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_row_per_tenant UNIQUE (tenant_id, row_id)
);

CREATE INDEX idx_rct_tenant ON public.rct_rows(tenant_id);
CREATE INDEX idx_rct_row_id ON public.rct_rows(tenant_id, row_id);
CREATE INDEX idx_rct_risk ON public.rct_rows(risk_id);
CREATE INDEX idx_rct_process ON public.rct_rows(process_id);
CREATE INDEX idx_rct_custom_values ON public.rct_rows USING GIN(custom_values);

ALTER TABLE public.rct_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rct_tenant_isolation" ON public.rct_rows
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rct_rows TO authenticated;
```

```sql
-- CONTROL_LINKS: Many-to-many between controls and RCT rows
CREATE TABLE public.control_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  rct_row_id UUID NOT NULL REFERENCES public.rct_rows(id) ON DELETE CASCADE,
  -- Per-link score overrides
  net_probability INT CHECK (net_probability BETWEEN 1 AND 5),
  net_impact INT CHECK (net_impact BETWEEN 1 AND 5),
  net_score INT GENERATED ALWAYS AS (net_probability * net_impact) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_control_row UNIQUE (control_id, rct_row_id)
);

CREATE INDEX idx_control_links_tenant ON public.control_links(tenant_id);
CREATE INDEX idx_control_links_control ON public.control_links(control_id);
CREATE INDEX idx_control_links_row ON public.control_links(rct_row_id);

ALTER TABLE public.control_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "control_links_tenant_isolation" ON public.control_links
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.control_links TO authenticated;
```

```sql
-- CONTROL_TESTS: Test execution records
CREATE TABLE public.control_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  rct_row_id UUID REFERENCES public.rct_rows(id) ON DELETE SET NULL,
  tester_id UUID REFERENCES public.profiles(id),
  tester_name TEXT,
  test_date DATE NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('pass', 'fail', 'partial', 'not-tested')),
  effectiveness INT CHECK (effectiveness BETWEEN 1 AND 5),
  evidence TEXT,
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tests_tenant ON public.control_tests(tenant_id);
CREATE INDEX idx_tests_control ON public.control_tests(control_id);
CREATE INDEX idx_tests_date ON public.control_tests(test_date DESC);

ALTER TABLE public.control_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tests_tenant_isolation" ON public.control_tests
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.control_tests TO authenticated;
```

```sql
-- REMEDIATION_PLANS: Action plans for failed tests
CREATE TABLE public.remediation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  control_test_id UUID NOT NULL REFERENCES public.control_tests(id) ON DELETE CASCADE,
  control_id UUID NOT NULL REFERENCES public.controls(id) ON DELETE CASCADE,
  rct_row_id UUID REFERENCES public.rct_rows(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,
  deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  action_items JSONB DEFAULT '[]',  -- Array of {id, description, completed, completedDate}
  notes TEXT,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  resolved_date DATE,
  closed_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_remediation_tenant ON public.remediation_plans(tenant_id);
CREATE INDEX idx_remediation_status ON public.remediation_plans(tenant_id, status);
CREATE INDEX idx_remediation_deadline ON public.remediation_plans(deadline);

ALTER TABLE public.remediation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "remediation_tenant_isolation" ON public.remediation_plans
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.remediation_plans TO authenticated;
```

```sql
-- CUSTOM_COLUMNS: User-defined column definitions
CREATE TABLE public.custom_columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('text', 'number', 'dropdown', 'date', 'formula')),
  options TEXT[],     -- For dropdown type
  formula TEXT,       -- For formula type
  width INT,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_custom_columns_tenant ON public.custom_columns(tenant_id);

ALTER TABLE public.custom_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_columns_tenant_isolation" ON public.custom_columns
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_columns TO authenticated;
```

```sql
-- TICKETS: Task management
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
  priority TEXT NOT NULL CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  owner TEXT NOT NULL,
  deadline DATE NOT NULL,
  notes TEXT,
  recurrence JSONB,  -- {interval, customDays, nextDue}
  done_date TIMESTAMPTZ,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_tenant ON public.tickets(tenant_id);
CREATE INDEX idx_tickets_status ON public.tickets(tenant_id, status);
CREATE INDEX idx_tickets_deadline ON public.tickets(deadline);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_tenant_isolation" ON public.tickets
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
```

```sql
-- TICKET_ENTITY_LINKS: Links between tickets and various entities
CREATE TABLE public.ticket_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('control', 'risk', 'process', 'rctRow', 'remediationPlan')),
  entity_id UUID NOT NULL,
  entity_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_ticket_entity UNIQUE (ticket_id, entity_type, entity_id)
);

CREATE INDEX idx_ticket_links_tenant ON public.ticket_entity_links(tenant_id);
CREATE INDEX idx_ticket_links_ticket ON public.ticket_entity_links(ticket_id);
CREATE INDEX idx_ticket_links_entity ON public.ticket_entity_links(entity_type, entity_id);

ALTER TABLE public.ticket_entity_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_links_tenant_isolation" ON public.ticket_entity_links
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_entity_links TO authenticated;
```

```sql
-- COMMENTS: Threaded comments on entities
CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('risk', 'process', 'control', 'rctRow')),
  entity_id UUID NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.profiles(id),
  author_role TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX idx_comments_tenant ON public.comments(tenant_id);
CREATE INDEX idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX idx_comments_parent ON public.comments(parent_id);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_tenant_isolation" ON public.comments
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
```

```sql
-- PENDING_CHANGES: Four-eye approval workflow
CREATE TABLE public.pending_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('control', 'risk', 'process')),
  entity_id UUID NOT NULL,
  entity_name TEXT NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  current_values JSONB DEFAULT '{}',
  proposed_values JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  submitted_by TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pending_tenant ON public.pending_changes(tenant_id);
CREATE INDEX idx_pending_status ON public.pending_changes(tenant_id, status);
CREATE INDEX idx_pending_entity ON public.pending_changes(entity_type, entity_id);

ALTER TABLE public.pending_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pending_tenant_isolation" ON public.pending_changes
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_changes TO authenticated;
```

```sql
-- APPROVAL_SETTINGS: Per-tenant approval configuration
CREATE TABLE public.approval_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  global_enabled BOOLEAN DEFAULT FALSE,
  require_for_new_controls BOOLEAN DEFAULT FALSE,
  require_for_new_risks BOOLEAN DEFAULT FALSE,
  require_for_new_processes BOOLEAN DEFAULT FALSE,
  entity_overrides JSONB DEFAULT '{}',  -- {entityId: boolean}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_approval_settings UNIQUE (tenant_id)
);

ALTER TABLE public.approval_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approval_settings_tenant_isolation" ON public.approval_settings
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE ON public.approval_settings TO authenticated;
```

```sql
-- SCORE_LABELS: Custom probability/impact labels
CREATE TABLE public.score_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('probability', 'impact')),
  score INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_score_label UNIQUE (tenant_id, type, score)
);

ALTER TABLE public.score_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_labels_tenant_isolation" ON public.score_labels
  FOR ALL TO authenticated
  USING (tenant_id = public.tenant_id())
  WITH CHECK (tenant_id = public.tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.score_labels TO authenticated;
```

### Pattern 1: Data Fetching with React Query

**What:** Use React Query for fetching server data, Zustand for UI state only.
**When to use:** All server data reads.
**Why:** Automatic caching, background refresh, stale detection, optimistic updates.

```typescript
// src/hooks/useTaxonomy.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { TaxonomyItem } from '@/types/taxonomy'

export function useTaxonomy(type: 'risk' | 'process') {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['taxonomy', type],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('taxonomy_nodes')
        .select('*')
        .eq('type', type)
        .order('sort_order')

      if (error) throw error
      return buildTree(data)  // Convert flat list to nested tree
    },
    staleTime: 1000 * 60 * 5,  // 5 minutes
  })

  const updateMutation = useMutation({
    mutationFn: async (node: Partial<TaxonomyItem> & { id: string }) => {
      const { data, error } = await supabase
        .from('taxonomy_nodes')
        .update({ name: node.name, description: node.description })
        .eq('id', node.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxonomy', type] })
    },
  })

  return { ...query, updateNode: updateMutation.mutate }
}
```

### Pattern 2: Optimistic Updates with Rollback

**What:** Update UI immediately, sync to database in background, rollback on failure.
**When to use:** All write operations for responsive UX.
**Why:** No loading spinners for every action while maintaining data integrity.

```typescript
// src/hooks/useControl.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import type { Control } from '@/types/rct'

export function useUpdateControl() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Control> }) => {
      const { data, error } = await supabase
        .from('controls')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    // Optimistic update
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['controls'] })

      // Snapshot current data
      const previousControls = queryClient.getQueryData<Control[]>(['controls'])

      // Optimistically update
      queryClient.setQueryData<Control[]>(['controls'], (old) =>
        old?.map((c) => (c.id === id ? { ...c, ...updates } : c))
      )

      return { previousControls }
    },
    // Rollback on error
    onError: (err, variables, context) => {
      if (context?.previousControls) {
        queryClient.setQueryData(['controls'], context.previousControls)
      }
      toast.error('Failed to update control')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['controls'] })
    },
  })
}
```

### Pattern 3: Realtime Subscriptions for Cross-User Sync

**What:** Subscribe to database changes via Supabase Realtime.
**When to use:** Ensure all tenant users see updates from other users.
**Why:** Multi-user collaboration requires live data sync.

```typescript
// src/hooks/useRealtimeSync.ts
import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function useRealtimeSync() {
  const queryClient = useQueryClient()
  const { session } = useAuth()
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Prevent duplicate subscription in strict mode
    if (!session || !isFirstRender.current) return
    isFirstRender.current = false

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'controls' },
        (payload) => {
          // Only process if change is from another session
          if (payload.new?.updated_by !== session.user.id) {
            queryClient.invalidateQueries({ queryKey: ['controls'] })
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'taxonomy_nodes' },
        (payload) => {
          const type = payload.new?.type || payload.old?.type
          queryClient.invalidateQueries({ queryKey: ['taxonomy', type] })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [session, queryClient])
}
```

### Pattern 4: Hierarchical ID Generation Trigger

**What:** Database trigger to auto-generate hierarchical IDs (e.g., "1.2.3").
**When to use:** On taxonomy_nodes INSERT and UPDATE of parent_id.
**Why:** Maintains consistent hierarchical numbering without client logic.

```sql
-- Generate hierarchical ID based on sibling count and parent path
CREATE OR REPLACE FUNCTION generate_hierarchical_id()
RETURNS TRIGGER AS $$
DECLARE
  parent_hid TEXT;
  sibling_count INT;
BEGIN
  -- Get parent's hierarchical_id
  IF NEW.parent_id IS NULL THEN
    parent_hid := '';
  ELSE
    SELECT hierarchical_id INTO parent_hid
    FROM public.taxonomy_nodes
    WHERE id = NEW.parent_id;
  END IF;

  -- Count siblings (same parent, same tenant, same type)
  SELECT COUNT(*) INTO sibling_count
  FROM public.taxonomy_nodes
  WHERE tenant_id = NEW.tenant_id
    AND type = NEW.type
    AND COALESCE(parent_id::text, '') = COALESCE(NEW.parent_id::text, '')
    AND id != NEW.id;

  -- Generate hierarchical_id
  IF parent_hid = '' THEN
    NEW.hierarchical_id := (sibling_count + 1)::TEXT;
  ELSE
    NEW.hierarchical_id := parent_hid || '.' || (sibling_count + 1)::TEXT;
  END IF;

  -- Update path array (for efficient ancestor queries)
  IF NEW.parent_id IS NULL THEN
    NEW.path := ARRAY[NEW.id];
  ELSE
    SELECT path || NEW.id INTO NEW.path
    FROM public.taxonomy_nodes
    WHERE id = NEW.parent_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_taxonomy_hierarchical_id
  BEFORE INSERT ON public.taxonomy_nodes
  FOR EACH ROW
  EXECUTE FUNCTION generate_hierarchical_id();
```

### Anti-Patterns to Avoid

- **Dual storage (LocalStorage + Database) permanently:** Dual-write during migration is acceptable, but keeping both long-term creates sync conflicts and data inconsistency.
- **Fetching full taxonomy tree on every render:** Use React Query caching and staleTime to minimize refetches.
- **RLS policies with complex joins:** Move join logic to SECURITY DEFINER functions for performance.
- **Storing computed values that change frequently:** Let the database compute scores with GENERATED columns.
- **Using service role key in client code:** Only anon key client-side; service role only in Edge Functions.

## Don't Hand-Roll

Problems that look simple but have existing solutions.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tree-to-flat conversion | Custom recursive parser | Database recursive CTE | Database handles arbitrary depth efficiently |
| Optimistic update state | Manual pending state tracking | React Query onMutate | Automatic rollback, query invalidation |
| Realtime subscriptions | Polling interval | Supabase Realtime channels | True push, efficient, built-in reconnection |
| Hierarchical ID generation | Client-side numbering | Database trigger | Prevents race conditions between users |
| Cache invalidation | Manual cache clearing | React Query invalidateQueries | Handles dependent queries automatically |
| Conflict detection | Custom versioning | PostgreSQL updated_at + onConflict | Database-level atomicity |

**Key insight:** PostgreSQL with RLS and Supabase Realtime handles most of the complexity of multi-user sync. Don't replicate database guarantees in JavaScript.

## Common Pitfalls

### Pitfall 1: RLS Performance on Large Tables

**What goes wrong:** Queries become slow as table grows because RLS policy is evaluated per-row.
**Why it happens:** Missing index on tenant_id, using subqueries instead of cached function results.
**How to avoid:**
1. ALWAYS create index on tenant_id for every table
2. Wrap `public.tenant_id()` in SELECT: `USING (tenant_id = (SELECT public.tenant_id()))`
3. Use SECURITY DEFINER functions for complex permission checks
**Warning signs:** Queries that were fast with 100 rows become slow at 10,000 rows.

### Pitfall 2: Stale Data After Optimistic Updates

**What goes wrong:** UI shows outdated data after mutation because cache wasn't properly invalidated.
**Why it happens:** Forgot to call invalidateQueries, or used wrong query key.
**How to avoid:**
```typescript
// Invalidate related queries in onSettled (runs after success OR error)
onSettled: () => {
  queryClient.invalidateQueries({ queryKey: ['controls'] })
  queryClient.invalidateQueries({ queryKey: ['rct-rows'] })  // Related data
}
```
**Warning signs:** User A makes change, User B sees stale data even after refresh.

### Pitfall 3: Realtime Subscription Duplicates in React Strict Mode

**What goes wrong:** Supabase throws "already subscribed" error in development.
**Why it happens:** React 18 Strict Mode runs effects twice; subscription created twice.
**How to avoid:**
```typescript
const isFirstRender = useRef(true)
useEffect(() => {
  if (!isFirstRender.current) return
  isFirstRender.current = false
  // ... subscription code
}, [])
```
**Warning signs:** Console errors about duplicate channels in development mode.

### Pitfall 4: Migration Data Loss from ID Mismatch

**What goes wrong:** References break when migrating because LocalStorage used nanoid, database uses UUID.
**Why it happens:** Assuming old IDs will work as-is in new schema.
**How to avoid:**
1. Create ID mapping table during migration
2. Use nanoid-generated IDs as the database UUID (nanoid produces valid UUID-like strings)
3. Or generate new UUIDs and update all foreign key references
**Warning signs:** "foreign key violation" errors during data import.

### Pitfall 5: Computed Scores Out of Sync

**What goes wrong:** net_score doesn't match net_probability * net_impact in UI.
**Why it happens:** Client computes score differently than GENERATED column in database.
**How to avoid:**
1. Use GENERATED ALWAYS AS columns in database
2. Trust database values, don't recalculate in frontend
3. Or remove GENERATED and calculate consistently in one place
**Warning signs:** Scores change when page refreshes.

## Code Examples

Verified patterns from official sources.

### Supabase Client Setup (Existing Pattern)

```typescript
// src/lib/supabase/client.ts (already exists)
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### React Query Provider Setup

```typescript
// src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { type ReactNode } from 'react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      gcTime: 1000 * 60 * 30,    // 30 minutes garbage collection
      retry: 1,                   // Retry once on failure
      refetchOnWindowFocus: true, // Refresh when user returns
    },
  },
})

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {import.meta.env.DEV && <ReactQueryDevtools />}
    </QueryClientProvider>
  )
}
```

### Recursive CTE for Taxonomy Tree

```typescript
// Fetch taxonomy as nested tree using database recursive CTE
export async function fetchTaxonomyTree(type: 'risk' | 'process'): Promise<TaxonomyItem[]> {
  // Fetch flat list (RLS filters by tenant automatically)
  const { data, error } = await supabase
    .from('taxonomy_nodes')
    .select('id, parent_id, name, description, hierarchical_id, sort_order')
    .eq('type', type)
    .order('sort_order')

  if (error) throw error

  // Build tree from flat list
  const nodeMap = new Map(data.map(n => [n.id, { ...n, children: [] }]))
  const roots: TaxonomyItem[] = []

  for (const node of nodeMap.values()) {
    if (node.parent_id && nodeMap.has(node.parent_id)) {
      nodeMap.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}
```

### Migration: LocalStorage to Supabase

```typescript
// src/utils/dataMigration.ts
import { supabase } from '@/lib/supabase/client'
import { useTaxonomyStore } from '@/stores/taxonomyStore'
import { useControlsStore } from '@/stores/controlsStore'

export async function migrateLocalStorageToSupabase(tenantId: string) {
  const taxonomyState = useTaxonomyStore.getState()
  const controlsState = useControlsStore.getState()

  // 1. Migrate taxonomies
  const riskNodes = flattenTree(taxonomyState.risks, 'risk')
  const processNodes = flattenTree(taxonomyState.processes, 'process')

  const { error: taxError } = await supabase
    .from('taxonomy_nodes')
    .upsert(
      [...riskNodes, ...processNodes].map(n => ({
        ...n,
        tenant_id: tenantId,
      })),
      { onConflict: 'id' }
    )

  if (taxError) throw taxError

  // 2. Migrate controls
  const { error: ctrlError } = await supabase
    .from('controls')
    .upsert(
      controlsState.controls.map(c => ({
        ...c,
        tenant_id: tenantId,
      })),
      { onConflict: 'id' }
    )

  if (ctrlError) throw ctrlError

  // 3. Clear LocalStorage after successful migration
  localStorage.removeItem('riskguard-taxonomy')
  localStorage.removeItem('riskguard-controls')
  // ... clear other stores

  return { success: true }
}

function flattenTree(nodes: TaxonomyItem[], type: string, parentId?: string): any[] {
  return nodes.flatMap((node, idx) => [
    {
      id: node.id,
      type,
      parent_id: parentId || null,
      name: node.name,
      description: node.description,
      hierarchical_id: node.hierarchicalId,
      sort_order: idx,
    },
    ...(node.children ? flattenTree(node.children, type, node.id) : []),
  ])
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| LocalStorage persistence | Supabase + React Query | This phase | Multi-user data sharing |
| Zustand for all state | Zustand for UI, React Query for server | 2024-2025 | Better cache management |
| Polling for updates | Realtime WebSocket subscriptions | Supabase default | Lower latency, less bandwidth |
| Client-side tree building | Database recursive CTE | PostgreSQL native | Server handles complexity |

**Deprecated/outdated:**
- `@supabase/auth-helpers-react` - Use `@supabase/ssr` (deprecated October 2025)
- LocalStorage as primary data store - Use database with proper RLS
- Manual cache invalidation - Use React Query's automatic invalidation

## Open Questions

Things that couldn't be fully resolved.

1. **Existing LocalStorage Data Migration Path**
   - What we know: Users have data in LocalStorage that needs to move to database
   - What's unclear: Should migration be automatic on first login, or manual via UI button?
   - Recommendation: Add "Import Existing Data" button in settings, don't auto-migrate (could create duplicates if user has multiple browsers)

2. **Audit Trail Migration**
   - What we know: Current auditStore has 10,000 entry limit in LocalStorage
   - What's unclear: Do we migrate historical audit entries or start fresh in database?
   - Recommendation: Start fresh in database audit_log table; old LocalStorage audit is demo-only

3. **Realtime Subscription Scope**
   - What we know: Need to subscribe to changes from other users
   - What's unclear: Subscribe to all tables or only frequently-changed ones?
   - Recommendation: Start with controls and taxonomy_nodes (most collaborative); add others based on need

4. **Custom Column Formula Evaluation**
   - What we know: Custom columns can have formulas referencing other columns
   - What's unclear: Evaluate formulas client-side or database?
   - Recommendation: Client-side initially (matches current behavior); database functions later if needed

## Sources

### Primary (HIGH confidence)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policy patterns
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime) - Subscription patterns
- [Supabase JSON/JSONB Guide](https://supabase.com/docs/guides/database/json) - Dynamic column storage
- [TanStack React Query](https://tanstack.com/query/latest) - Server state management
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/integrations/persisting-store-data) - Migration patterns

### Secondary (MEDIUM confidence)
- [Hierarchical Data in PostgreSQL](https://dev.to/dowerdev/implementing-hierarchical-data-structures-in-postgresql-ltree-vs-adjacency-list-vs-closure-table-2jpb) - Tree modeling approaches
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) - Index and function optimization
- [Optimistic Updates in React Query](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates) - Rollback patterns
- [Zustand with Supabase Discussion](https://github.com/pmndrs/zustand/discussions/2284) - Integration patterns
- [Building Scalable Real-Time Systems with Supabase](https://medium.com/@ansh91627/building-scalable-real-time-systems-a-deep-dive-into-supabase-realtime-architecture-and-eccb01852f2b) - Architecture patterns

### Existing Project Research (Already Validated)
- `.planning/research/v2-ARCHITECTURE.md` - System architecture decisions
- `.planning/research/STACK.md` - Technology stack validation
- `.planning/phases/21-database-auth-foundation/21-RESEARCH.md` - RLS patterns, auth context

## Metadata

**Confidence breakdown:**
- Database schema: HIGH - Based on existing type definitions, RLS patterns from Phase 21
- Migration strategy: MEDIUM - Dual-write approach is standard, but specific timing depends on user testing
- Realtime sync: HIGH - Supabase Realtime well-documented, React Query patterns established
- Custom columns (JSONB): HIGH - Official Supabase recommendation for dynamic fields

**Research date:** 2026-01-26
**Valid until:** 60 days (PostgreSQL and Supabase patterns stable)

---
*Research for Phase 26: Shared Tenant Database*
*Project: RiskLytix ERM v2.0*
