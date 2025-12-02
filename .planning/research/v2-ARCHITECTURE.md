# Architecture Research: v2.0 Backend Integration

**Domain:** Enterprise Risk Management - Backend + Multi-Tenancy
**Researched:** 2026-01-24
**Confidence:** HIGH (verified with official docs and multiple sources)

## Executive Summary

This document defines how Supabase (PostgreSQL + Auth + Realtime), Resend (transactional email), and Vercel (deployment + cron) integrate with the existing RiskGuard React/Zustand architecture. The goal is to transition from LocalStorage persistence to a multi-tenant cloud backend while preserving the current state management patterns.

## Current vs Target Architecture

### Current State (v1.0)
```
+------------------+     +------------------+     +------------------+
|   React UI       | --> |   Zustand Stores | --> |   LocalStorage   |
|   Components     |     |   (immer)        |     |   (persist)      |
+------------------+     +------------------+     +------------------+
```

### Target State (v2.0)
```
+------------------+     +------------------+     +------------------+
|   React UI       | --> |   Zustand Stores | --> |   Supabase       |
|   Components     |     |   (immer)        |     |   PostgreSQL     |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|  Auth Context    |     |  Sync Layer      |     |  Row Level       |
|  (session)       |     |  (optimistic)    |     |  Security        |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        v                        v
+------------------+     +------------------+     +------------------+
|  Supabase Auth   |     |  Realtime        |     |  Edge Functions  |
|  (JWT + tenant)  |     |  Subscriptions   |     |  + Resend        |
+------------------+     +------------------+     +------------------+
                                 |
                                 v
                    +---------------------------+
                    |  Vercel Deployment        |
                    |  + Cron Jobs              |
                    +---------------------------+
```

## System Architecture Diagram

```
+===========================================================================+
|                           CLIENT LAYER (Browser)                          |
+===========================================================================+
|  +------------------+    +------------------+    +------------------+     |
|  |   React          |    |   Supabase       |    |   Auth Context   |     |
|  |   Components     |    |   Client SDK     |    |   Provider       |     |
|  +--------+---------+    +--------+---------+    +--------+---------+     |
|           |                       |                       |               |
|  +--------v---------+    +--------v---------+    +--------v---------+     |
|  |   Zustand        |    |   Sync Layer     |    |   Session        |     |
|  |   Stores         |<-->|   (NEW)          |<-->|   State          |     |
|  |   (unchanged)    |    |                  |    |   (tenant_id)    |     |
|  +------------------+    +------------------+    +------------------+     |
+===========================================================================+
            |                       |                       |
            v                       v                       v
+===========================================================================+
|                         SUPABASE PLATFORM                                 |
+===========================================================================+
|  +------------------+    +------------------+    +------------------+     |
|  |   Supabase Auth  |    |   PostgREST      |    |   Realtime       |     |
|  |   (email/pass)   |    |   (REST API)     |    |   (WebSocket)    |     |
|  +--------+---------+    +--------+---------+    +--------+---------+     |
|           |                       |                       |               |
|  +--------v-----------------------------------------------------------+   |
|  |                    PostgreSQL Database                              |   |
|  |  +------------+  +------------+  +------------+  +------------+    |   |
|  |  | taxonomy   |  | controls   |  | control_   |  | audit_log  |    |   |
|  |  | (risks/    |  |            |  | tests      |  |            |    |   |
|  |  | processes) |  |            |  |            |  |            |    |   |
|  |  +------------+  +------------+  +------------+  +------------+    |   |
|  |                                                                     |   |
|  |  +------------------------------------------------------------+    |   |
|  |  |     Row Level Security (RLS) - tenant_id filtering         |    |   |
|  |  +------------------------------------------------------------+    |   |
|  +---------------------------------------------------------------------+   |
|           |                                                               |
|  +--------v---------+    +------------------+    +------------------+     |
|  |   pg_cron        |    |   Edge Functions |    |   Database       |     |
|  |   (scheduling)   |    |   (Deno)         |    |   Webhooks       |     |
|  +------------------+    +--------+---------+    +------------------+     |
+===========================================================================+
                                    |
                                    v
+===========================================================================+
|                         EXTERNAL SERVICES                                 |
+===========================================================================+
|  +------------------+    +------------------+    +------------------+     |
|  |   Resend         |    |   Vercel         |    |   Vercel Cron    |     |
|  |   (email)        |    |   (hosting)      |    |   (fallback)     |     |
|  +------------------+    +------------------+    +------------------+     |
+===========================================================================+
```

## Component Boundaries

| Component | Responsibility | Communicates With | Location |
|-----------|---------------|-------------------|----------|
| **React Components** | UI rendering, user interaction | Zustand stores, Auth context | Client |
| **Zustand Stores** | Local state management, optimistic updates | Sync layer, components | Client |
| **Sync Layer** | Bidirectional sync between Zustand and Supabase | Zustand, Supabase client | Client (NEW) |
| **Auth Context** | Session management, tenant resolution | Supabase Auth, all protected components | Client |
| **Supabase Client** | API calls, realtime subscriptions | Supabase platform | Client |
| **PostgreSQL + RLS** | Data storage, access control | All via PostgREST | Supabase |
| **Edge Functions** | Email sending, complex business logic | Resend API, database | Supabase |
| **pg_cron** | Scheduled database tasks | Database, Edge Functions | Supabase |
| **Vercel Cron** | Backup scheduling, health checks | Edge Functions via HTTP | Vercel |

## Recommended Architecture Patterns

### Pattern 1: Auth Context Provider with Tenant Resolution

**What:** Centralized authentication state with tenant_id extraction from JWT claims.

**When:** Wrap entire application; provides session and tenant context to all components.

**Why:** Supabase stores tenant_id in `app_metadata` (user-immutable), making it secure for RLS.

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthContextType {
  session: Session | null
  user: User | null
  tenantId: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Extract tenant_id from user's app_metadata (set by admin, not editable by user)
  const tenantId = session?.user?.app_metadata?.tenant_id ?? null

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription?.unsubscribe()
  }, [])

  // ... sign in/out methods

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, tenantId, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Pattern 2: Zustand Store with Supabase Sync Layer

**What:** Keep existing Zustand stores but add a sync layer that:
1. Loads initial data from Supabase on mount
2. Pushes local changes to Supabase (optimistic updates)
3. Subscribes to Realtime for external changes

**When:** For all domain stores (controls, taxonomy, tickets, etc.)

**Why:** Preserves existing store logic while adding backend persistence. Zustand remains source of truth for UI, Supabase is source of truth for persistence.

```typescript
// src/lib/sync/createSyncedStore.ts
import { StateCreator, create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { supabase } from '@/lib/supabase'

interface SyncConfig<T> {
  tableName: string
  storeKey: keyof T  // Which array in the store to sync
  idField?: string   // Default: 'id'
}

// Wrapper that adds sync capabilities to any Zustand store
export function withSupabaseSync<T extends object>(
  config: SyncConfig<T>,
  storeCreator: StateCreator<T, [['zustand/immer', never]]>
) {
  return create<T>()(
    immer((set, get, api) => {
      const store = storeCreator(set, get, api)

      // Initialize: Load from Supabase and subscribe to changes
      const initialize = async () => {
        const { data, error } = await supabase
          .from(config.tableName)
          .select('*')

        if (data) {
          set((state: any) => {
            state[config.storeKey] = data
          })
        }

        // Subscribe to realtime changes
        supabase
          .channel(`${config.tableName}-changes`)
          .on('postgres_changes',
            { event: '*', schema: 'public', table: config.tableName },
            (payload) => {
              // Handle INSERT, UPDATE, DELETE
              handleRealtimeChange(payload, set, config)
            }
          )
          .subscribe()
      }

      return {
        ...store,
        _initialize: initialize,
      }
    })
  )
}
```

### Pattern 3: Optimistic Updates with Rollback

**What:** Update local state immediately, sync to Supabase in background, rollback on failure.

**When:** All write operations (create, update, delete).

**Why:** Maintains responsive UX (no loading spinners for every action) while ensuring data consistency.

```typescript
// src/hooks/useOptimisticMutation.ts
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useOptimisticMutation<T extends { id: string }>(
  tableName: string,
  localUpdate: (item: T) => void,
  localRollback: (item: T) => void
) {
  const [pending, setPending] = useState<Map<string, T>>(new Map())

  const mutate = async (item: T, type: 'insert' | 'update' | 'delete') => {
    // 1. Store original for rollback
    setPending(p => new Map(p).set(item.id, item))

    // 2. Optimistically update local state
    localUpdate(item)

    try {
      // 3. Sync to Supabase
      let result
      switch (type) {
        case 'insert':
          result = await supabase.from(tableName).insert(item)
          break
        case 'update':
          result = await supabase.from(tableName).update(item).eq('id', item.id)
          break
        case 'delete':
          result = await supabase.from(tableName).delete().eq('id', item.id)
          break
      }

      if (result.error) throw result.error
    } catch (error) {
      // 4. Rollback on failure
      localRollback(pending.get(item.id)!)
      throw error
    } finally {
      setPending(p => {
        const next = new Map(p)
        next.delete(item.id)
        return next
      })
    }
  }

  return { mutate, isPending: pending.size > 0 }
}
```

### Pattern 4: Row-Level Security with tenant_id

**What:** Every table has a `tenant_id` column. RLS policies ensure users can only access their tenant's data.

**When:** All multi-tenant tables.

**Why:** Security at the database level prevents data leakage even if application code has bugs.

```sql
-- Example: controls table with RLS
CREATE TABLE controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  control_type TEXT,
  -- ... other fields
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their tenant's controls
CREATE POLICY "tenant_isolation" ON controls
  FOR ALL
  USING (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID
  );

-- Policy: Insert must include correct tenant_id
CREATE POLICY "tenant_insert" ON controls
  FOR INSERT
  WITH CHECK (
    tenant_id = (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID
  );
```

### Pattern 5: Edge Functions for Email via Resend

**What:** Supabase Edge Functions handle email sending using Resend API.

**When:** Test reminders, overdue notifications, password reset, user invitations.

**Why:** Edge Functions run server-side (secrets are secure), integrate natively with Supabase Auth hooks.

```typescript
// supabase/functions/send-test-reminder/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { to, controlName, testDueDate, testerName } = await req.json()

  const { data, error } = await resend.emails.send({
    from: 'RiskGuard <notifications@riskguard.app>',
    to: [to],
    subject: `Control Test Reminder: ${controlName}`,
    html: `
      <h2>Control Test Due</h2>
      <p>Hi ${testerName},</p>
      <p>The control "${controlName}" is due for testing on ${testDueDate}.</p>
      <p>Please log in to RiskGuard to complete the test.</p>
    `,
  })

  if (error) {
    return new Response(JSON.stringify({ error }), { status: 400 })
  }

  return new Response(JSON.stringify({ success: true, data }), { status: 200 })
})
```

### Pattern 6: pg_cron for Database-Level Scheduling

**What:** PostgreSQL extension for scheduled jobs running inside the database.

**When:** Recurring tasks that operate on database data (notifications, cleanup, aggregations).

**Why:** No external dependencies, runs with database permissions, zero network latency.

```sql
-- Schedule daily check for overdue tests at 8am UTC
SELECT cron.schedule(
  'check-overdue-tests',
  '0 8 * * *',  -- Every day at 8:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-overdue-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('check_type', 'overdue_tests')
  );
  $$
);

-- Schedule weekly summary emails every Monday at 9am
SELECT cron.schedule(
  'weekly-summary',
  '0 9 * * 1',  -- Every Monday at 9:00 AM UTC
  $$
  SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/send-weekly-summary',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### Pattern 7: Vercel Cron as Backup/Health Check

**What:** Vercel cron jobs call Edge Functions via HTTP as backup scheduling.

**When:** Critical scheduled tasks that need redundancy beyond pg_cron.

**Why:** Defense in depth - if pg_cron fails, Vercel cron provides fallback.

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-overdue",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/health-check",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

```typescript
// api/cron/check-overdue.ts (Vercel API route)
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: Request) {
  // Verify Vercel cron secret
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Call Supabase Edge Function
  const response = await fetch(
    `${process.env.SUPABASE_URL}/functions/v1/send-overdue-notifications`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ source: 'vercel-cron' }),
    }
  )

  return new Response(JSON.stringify({ triggered: true }), { status: 200 })
}
```

## Data Flow Diagrams

### Authentication Flow

```
User enters credentials
         |
         v
LoginPage.signIn()
         |
         v
supabase.auth.signInWithPassword()
         |
         v
Supabase Auth validates credentials
         |
         v
JWT returned with app_metadata.tenant_id
         |
         v
AuthContext updates session state
         |
         v
Protected routes become accessible
         |
         v
All API calls include JWT (auto-attached by client)
         |
         v
RLS policies filter data by tenant_id from JWT
```

### Write Operation Flow (Optimistic)

```
User clicks "Save Control"
         |
         v
Component calls store.updateControl(control)
         |
         v
Zustand store updates immediately (optimistic)
         |
         v
UI re-renders with new data (instant feedback)
         |
         v
Sync layer calls supabase.from('controls').update()
         |
         v
PostgreSQL validates RLS, performs update
         |
         v
+------------------+--------------------+
| SUCCESS          | FAILURE            |
+------------------+--------------------+
| Sync complete    | Rollback local     |
| (no UI change)   | state, show error  |
+------------------+--------------------+
```

### Realtime Sync Flow

```
External user (same tenant) updates control
         |
         v
PostgreSQL commits change
         |
         v
Supabase Realtime publishes to channel
         |
         v
Client WebSocket receives 'postgres_changes' event
         |
         v
Sync layer checks if change is from another session
         |
+------------------+--------------------+
| EXTERNAL CHANGE  | OWN CHANGE         |
+------------------+--------------------+
| Update Zustand   | Ignore (already    |
| store with new   | have local state)  |
| data             |                    |
+------------------+--------------------+
         |
         v
UI re-renders with external changes
```

### Email Notification Flow

```
pg_cron triggers at scheduled time
         |
         v
SQL calls net.http_post() to Edge Function
         |
         v
Edge Function queries controls due for testing
         |
         v
For each due control:
         |
         v
Edge Function calls Resend API
         |
         v
Resend delivers email to tester
         |
         v
Edge Function logs result to notifications table
```

## Database Schema (Key Tables)

```sql
-- Core multi-tenancy
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  full_name TEXT,
  role TEXT CHECK (role IN ('manager', 'risk-manager', 'control-owner', 'control-tester')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Taxonomy nodes (shared structure for risks and processes)
CREATE TABLE taxonomy_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type TEXT NOT NULL CHECK (type IN ('risk', 'process')),
  parent_id UUID REFERENCES taxonomy_nodes(id),
  name TEXT NOT NULL,
  description TEXT,
  hierarchical_id TEXT,  -- e.g., "1.2.3"
  level INT CHECK (level BETWEEN 1 AND 5),
  weight NUMERIC(3,1) DEFAULT 1.0,
  "order" INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Controls (global within tenant)
CREATE TABLE controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  description TEXT,
  control_type TEXT,
  test_frequency TEXT,
  test_procedure TEXT,
  assigned_tester_id UUID REFERENCES profiles(id),
  next_test_date DATE,
  last_test_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Control links (many-to-many: controls <-> RCT rows)
CREATE TABLE control_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  row_id TEXT NOT NULL,  -- Composite key: riskLeafId:processLeafId
  net_probability INT,
  net_impact INT,
  net_score INT GENERATED ALWAYS AS (net_probability * net_impact) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RCT row scores (row_id = riskLeafId:processLeafId)
CREATE TABLE rct_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  row_id TEXT NOT NULL,
  gross_probability INT,
  gross_impact INT,
  gross_score INT GENERATED ALWAYS AS (gross_probability * gross_impact) STORED,
  risk_appetite INT DEFAULT 9,
  custom_values JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, row_id)
);

-- Control tests
CREATE TABLE control_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  control_id UUID NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
  tester_id UUID REFERENCES profiles(id),
  test_date DATE NOT NULL,
  result TEXT CHECK (result IN ('pass', 'fail', 'partial', 'not-tested')),
  effectiveness INT,
  evidence TEXT,
  findings TEXT,
  recommendations TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  change_type TEXT CHECK (change_type IN ('create', 'update', 'delete')),
  field_changes JSONB,
  user_id UUID REFERENCES profiles(id),
  user_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email notifications log
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  type TEXT NOT NULL,  -- 'test_reminder', 'overdue_alert', 'weekly_summary'
  recipient_email TEXT NOT NULL,
  recipient_id UUID REFERENCES profiles(id),
  subject TEXT,
  status TEXT CHECK (status IN ('sent', 'failed', 'pending')),
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Bypassing RLS with Service Role Key in Client

**What people do:** Use `SUPABASE_SERVICE_ROLE_KEY` in frontend code to bypass RLS.

**Why it's wrong:** Service role key has full database access. If exposed in client bundle, anyone can access all tenant data.

**Do this instead:** Use `SUPABASE_ANON_KEY` in client. Service role key only in Edge Functions and server-side code.

### Anti-Pattern 2: Storing tenant_id in user_metadata

**What people do:** Store tenant_id in `user_metadata` which users can modify.

**Why it's wrong:** Users could change their tenant_id and access other tenants' data.

**Do this instead:** Store tenant_id in `app_metadata` (only modifiable by service role/admin).

### Anti-Pattern 3: Fetching All Data Then Filtering in JavaScript

**What people do:** `supabase.from('controls').select('*')` then filter by tenant in code.

**Why it's wrong:** RLS should handle filtering. If RLS is off or misconfigured, all data is exposed.

**Do this instead:** Trust RLS. Query without client-side tenant filtering - RLS does it automatically.

### Anti-Pattern 4: Not Handling Realtime Reconnections

**What people do:** Subscribe to realtime once and assume it stays connected.

**Why it's wrong:** Mobile/browser tab switches can disconnect. Missed updates during disconnect cause stale data.

**Do this instead:** Monitor subscription status, reload data on reconnect, handle errors gracefully.

### Anti-Pattern 5: Synchronous localStorage Persistence + Supabase

**What people do:** Keep Zustand persist middleware writing to localStorage while also syncing to Supabase.

**Why it's wrong:** Creates two sources of truth. localStorage can have stale data after sync conflicts.

**Do this instead:** Remove localStorage persistence for synced stores. Supabase is the source of truth. Optional: use localStorage only for offline queue.

### Anti-Pattern 6: Running Too Many pg_cron Jobs Simultaneously

**What people do:** Schedule 20+ cron jobs at the same minute.

**Why it's wrong:** pg_cron uses database connections. Too many concurrent jobs exhaust connection pool.

**Do this instead:** Stagger job schedules. Max 8 concurrent jobs recommended. Space jobs at least 1 minute apart.

## Migration Strategy: LocalStorage to Supabase

### Phase 1: Add Supabase Infrastructure (No Data Migration)
1. Set up Supabase project
2. Create database schema with RLS
3. Add Auth (email/password)
4. Deploy Edge Functions for email

### Phase 2: Dual-Write Mode
1. Keep existing Zustand stores with localStorage
2. Add sync layer that writes to both localStorage AND Supabase
3. Realtime subscriptions update local state
4. Validate data consistency

### Phase 3: Supabase Primary
1. Load initial data from Supabase (not localStorage)
2. Remove localStorage persist middleware
3. LocalStorage becomes offline queue only
4. Supabase is source of truth

### Phase 4: Cleanup
1. Remove localStorage fallback code
2. Remove dual-write logic
3. Full Supabase dependency

## Scalability Considerations

| Scale | Recommendations |
|-------|-----------------|
| **<10 tenants, <1000 controls** | Current architecture works perfectly. Single Supabase project. |
| **10-100 tenants** | Monitor connection pool. Consider read replicas for analytics queries. |
| **100+ tenants** | Evaluate tenant sharding strategies. Consider dedicated Supabase projects for large tenants. |

### Performance Optimizations

1. **Index all tenant_id columns** - Every RLS policy query uses tenant_id
2. **Batch realtime subscriptions** - Subscribe to table-level changes, not row-level
3. **Debounce optimistic updates** - Don't sync every keystroke, debounce 300ms
4. **Paginate large datasets** - RCT can have thousands of rows, use cursor pagination
5. **Cache static data** - Taxonomy rarely changes, cache in Zustand with TTL

## Build Order Recommendations

Based on dependencies, suggested implementation order:

### Phase 1: Auth Foundation (Week 1)
1. Supabase project setup
2. Database schema (tenants, profiles tables)
3. RLS policies for auth tables
4. AuthContext provider
5. Login/logout flow
6. Protected routes

**Dependency:** Nothing depends on this completing, but everything after depends on it.

### Phase 2: Core Data Migration (Week 2-3)
1. taxonomy_nodes table + RLS
2. controls table + RLS
3. control_links table + RLS
4. Sync layer for taxonomyStore
5. Sync layer for controlsStore
6. Realtime subscriptions

**Dependency:** Requires Phase 1 (auth) complete.

### Phase 3: Control Testing + Audit (Week 3-4)
1. control_tests table + RLS
2. audit_log table + RLS
3. Sync layer for remaining stores
4. Migrate audit middleware to write to Supabase

**Dependency:** Requires Phase 2 (core data) complete.

### Phase 4: Email Notifications (Week 4-5)
1. Edge Functions setup
2. Resend integration
3. notification_log table
4. pg_cron scheduled jobs
5. Test reminder emails
6. Overdue notifications

**Dependency:** Requires Phase 3 (control tests) for test due date data.

### Phase 5: Vercel Deployment (Week 5-6)
1. Vercel project configuration
2. Environment variables
3. Cron job backup routes
4. Production deployment
5. DNS and domain setup

**Dependency:** Requires all previous phases functional.

## Sources

**Supabase + Zustand Integration:**
- [Medium: How to use Zustand with Supabase and Next.js](https://medium.com/@ozergklp/how-to-use-zustand-with-supabase-and-next-js-app-router-0473d6744abc)
- [Restack: Supabase Zustand Integration Guide](https://www.restack.io/docs/supabase-knowledge-supabase-zustand-integration)
- [Supabase Docs: Use Supabase with React](https://supabase.com/docs/guides/getting-started/quickstarts/reactjs)

**Multi-Tenant RLS:**
- [Supabase Docs: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [AntStack: Multi-Tenant Applications with RLS on Supabase](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [DEV.to: Enforcing Row Level Security in Supabase Multi-Tenant Architecture](https://dev.to/blackie360/-enforcing-row-level-security-in-supabase-a-deep-dive-into-lockins-multi-tenant-architecture-4hd2)
- [Leanware: Best Practices for Supabase](https://www.leanware.co/insights/supabase-best-practices)

**Edge Functions + Email:**
- [Supabase Docs: Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Docs: Sending Emails](https://supabase.com/docs/guides/functions/examples/send-emails)
- [Resend: Send emails with Supabase](https://resend.com/supabase)
- [Resend Docs: Send with Supabase Edge Functions](https://resend.com/docs/send-with-supabase-edge-functions)
- [Medium: Email Notification Architecture with Supabase Edge Functions](https://khizerrehandev.medium.com/email-notification-architecture-5f3ee18b659c)

**Scheduling (pg_cron + Vercel):**
- [Supabase: Supabase Cron](https://supabase.com/modules/cron)
- [Supabase Docs: pg_cron Extension](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Supabase Docs: Scheduling Edge Functions](https://supabase.com/docs/guides/functions/schedule-functions)
- [Vercel Docs: Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Vercel: How to Setup Cron Jobs](https://vercel.com/kb/guide/how-to-setup-cron-jobs-on-vercel)

**Auth + Session Management:**
- [Supabase Docs: Use Supabase Auth with React](https://supabase.com/docs/guides/auth/quickstarts/react)
- [DeepWiki: Session Management in Supabase Auth](https://deepwiki.com/supabase/auth-js/4-session-management)
- [Medium: Building Seamless Authentication in React with Supabase](https://medium.com/@sune.sorgenfrei/building-seamless-authentication-in-react-with-supabase-a-modern-approach-36e7c78b5631)

**Realtime + Sync:**
- [egghead.io: Subscribe to Database Changes with Supabase Realtime](https://egghead.io/lessons/supabase-subscribe-to-database-changes-with-supabase-realtime)
- [GitHub Discussion: Optimistic Updates in Supabase](https://github.com/orgs/supabase/discussions/1753)
- [RxDB: Supabase Replication Plugin](https://rxdb.info/replication-supabase.html)
- [PowerSync: Bringing Offline-First to Supabase](https://www.powersync.com/blog/bringing-offline-first-to-supabase)

---
*Architecture research for: RiskGuard ERM v2.0 - Backend Integration*
*Researched: 2026-01-24*
