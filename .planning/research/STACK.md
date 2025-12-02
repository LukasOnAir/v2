# Stack Research

**Domain:** Enterprise Risk Management (ERM) / GRC Web Application
**Researched:** 2026-01-24 (v2.0 Backend Update)
**Confidence:** HIGH

## Executive Summary

This update extends the v1.0 stack research to cover production backend infrastructure for v2.0. The existing React + TypeScript + Vite + Tailwind CSS + Zustand stack remains validated. This document adds:

- **Supabase** for PostgreSQL + Auth + Row-Level Security (multi-tenancy)
- **Resend + React Email** for transactional emails
- **Vercel** for deployment with cron jobs
- **React Query** for server state management

The project already has `@supabase/supabase-js@2.91.1` installed. Key additions are minimal - the stack is designed to integrate cleanly with existing architecture.

---

## v2.0 Stack Additions

### Backend-as-a-Service: Supabase

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@supabase/supabase-js` | ^2.91.1 | Client SDK | **Already installed.** PostgreSQL + Auth + Realtime in one SDK. No additional install needed. |
| `@supabase/ssr` | ^0.8.0 | SSR/SSG auth helpers | Handles cookies and server-side session management. Replaces deprecated `@supabase/auth-helpers-*` packages. |

**Why Supabase:**
- Built-in Row Level Security for multi-tenancy (tenant_id pattern)
- Custom JWT claims via Auth Hooks for RBAC (5 roles: Director, Manager, Risk Manager, Control Owner, Control Tester)
- Postgres functions for database-level business logic
- Realtime subscriptions for live updates
- No cold starts for database operations (direct connection)

**Multi-Tenancy Pattern:**
```sql
-- Every table has tenant_id
CREATE TABLE risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name TEXT NOT NULL,
  -- ...
);

-- RLS policy ensures data isolation
CREATE POLICY tenant_isolation ON risks
  USING (tenant_id = auth.jwt() ->> 'tenant_id');
```

**RBAC Implementation:**
- Store roles in `user_roles` table
- Use Custom Access Token Auth Hook to inject role claim into JWT
- RLS policies check `auth.jwt() ->> 'role'` for role-based access

### Email: Resend + React Email

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `resend` | ^6.8.0 | Email API | Clean REST API, built by same team as React Email. Great developer experience. |
| `react-email` | ^5.2.5 | Email templates | React components for emails. Tailwind 4 support, dark mode, tested across email clients. |
| `@react-email/components` | ^0.3.0 | Email UI components | Pre-built components (Button, Section, Container, etc.) |

**Why Resend over SendGrid/Mailgun:**
- Same team built React Email (seamless integration)
- Webhook support for delivery/open/click tracking
- Regional sending (EU/US/Asia) for compliance
- Built-in spam scoring and link validation
- Simple pay-as-you-go pricing
- Direct Vercel marketplace integration

**Email Use Cases for RiskGuard:**
1. Test reminders (daily cron)
2. Approval requests (triggered by actions)
3. Deadline alerts (weekly cron)
4. Password reset (auth flow)

### Deployment: Vercel

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `vercel` CLI | latest | Deployment | Zero-config Vite support, Git-based deployments |
| `@vercel/functions` | ^3.3.6 | Serverless functions | Typed helpers for API routes |

**Why Vercel:**
- Zero-config Vite deployment (detected automatically)
- Fluid Compute solves connection pooling for Supabase
- Native cron jobs for scheduled tasks (no external scheduler needed)
- Preview deployments for every PR
- Built-in Supabase + Resend marketplace integrations
- Environment variable management

**Cron Jobs Configuration (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/test-reminders",
      "schedule": "0 8 * * *"
    },
    {
      "path": "/api/cron/deadline-alerts",
      "schedule": "0 9 * * 1"
    }
  ]
}
```

### Data Layer: React Query + Supabase

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@tanstack/react-query` | ^5.90.20 | Server state | Cache Supabase data, optimistic updates, automatic refetching |
| `@supabase-cache-helpers/postgrest-react-query` | ^1.13.7 | Supabase + React Query bridge | Automatic cache keys, pagination, cache invalidation on mutations |

**Why React Query with Supabase:**
- Reduces database requests through intelligent caching
- Automatic refetch on window focus and network reconnect
- Optimistic updates for snappy UX
- Cache helpers auto-invalidate related queries on mutations
- Separates server state from UI state (Zustand)

**State Separation Pattern:**
```typescript
// Zustand: UI state (local, ephemeral)
const { sidebarOpen, activeTab, formDraft } = useUIStore()

// React Query: Server state (remote, cached)
const { data: risks } = useQuery({ queryKey: ['risks'], queryFn: fetchRisks })
```

### Validation & Types

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `zod` | ^4.3.6 | Runtime validation | Form validation, API response validation, type inference |
| Supabase CLI | latest | Type generation | Generate TypeScript types from Postgres schema |

**Type Generation Workflow:**
```bash
# From remote (production schema)
npx supabase gen types typescript --project-id "PROJECT_ID" > src/types/database.types.ts

# From local (development)
npx supabase gen types typescript --local > src/types/database.types.ts
```

**Typed Supabase Client:**
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

---

## Complete v2.0 Stack

### Core (Already Installed - No Changes)

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.0.0 | UI Framework |
| TypeScript | ~5.7.2 | Type Safety |
| Vite | ^6.2.0 | Build Tool |
| Tailwind CSS | ^4.1.18 | Styling |
| Zustand | ^5.0.10 | Client State |
| @supabase/supabase-js | ^2.91.1 | Supabase Client |

### New Dependencies (v2.0 Additions)

```bash
# Supabase SSR helpers
npm install @supabase/ssr@^0.8.0

# Email
npm install resend@^6.8.0 react-email@^5.2.5 @react-email/components@^0.3.0

# Data layer
npm install @tanstack/react-query@^5.90.20
npm install @supabase-cache-helpers/postgrest-react-query@^1.13.7

# Validation
npm install zod@^4.3.6

# Dev dependencies
npm install -D supabase@latest vercel@latest
```

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `@supabase/auth-helpers-react` | Deprecated, archived October 2025 | `@supabase/ssr` |
| Supabase Edge Functions for DB ops | Cold starts, added latency | Postgres functions |
| Service role key in client code | Bypasses RLS, security vulnerability | Anon key only client-side |
| Prisma | Adds ORM complexity; Supabase provides typed queries | Generated types + supabase-js |
| NextAuth / Auth.js | Unnecessary; Supabase Auth handles everything | Supabase Auth |
| tRPC | Over-engineering; Supabase RPC + React Query sufficient | PostgREST + React Query |
| SWR | React Query has better Supabase cache helpers | React Query |
| SendGrid / Mailgun | Legacy APIs, more complex setup | Resend |
| Nodemailer | SMTP-based, not ideal for serverless | Resend |
| React Email Tailwind in Edge | Known 10s timeout issue | Standard components |

---

## Environment Variables

### Client-Side (VITE_ prefix)

```bash
# .env.local
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...  # Publishable key, safe for client
```

### Server-Side Only (Vercel Functions)

```bash
# Set in Vercel dashboard, NOT in .env files
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Bypasses RLS, never expose
RESEND_API_KEY=re_...
```

**Security Notes:**
- `VITE_` prefix exposes variables to client bundle
- `SUPABASE_SERVICE_ROLE_KEY` bypasses all RLS - server-only
- Store secrets in Vercel dashboard, not in repo
- Supabase is migrating to new publishable key format: `sb_publishable_xxx`

---

## Project Structure (v2.0 Additions)

```
src/
  lib/
    supabase/
      client.ts           # Browser Supabase client
      server.ts           # Server Supabase client (for API routes)
      types.ts            # Re-export generated database types
  api/                    # Vercel serverless functions
    send-email/
      route.ts            # Email sending endpoint
    cron/
      test-reminders.ts   # Daily test reminder cron
      deadline-alerts.ts  # Weekly deadline alert cron
  emails/                 # React Email templates
    test-reminder.tsx
    approval-request.tsx
    deadline-alert.tsx
  hooks/
    useAuth.ts            # Supabase auth state hook
    useRealtime.ts        # Supabase realtime subscription hook
  providers/
    QueryProvider.tsx     # React Query provider setup

supabase/
  migrations/             # Database migrations (SQL files)
    001_initial_schema.sql
    002_rls_policies.sql
  seed.sql               # Development seed data
  config.toml            # Local development config

vercel.json              # Cron jobs + deployment config
.env.local               # Local environment variables (gitignored)
```

---

## Key Patterns

### Supabase Client Setup

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

export const supabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)
```

### React Query Provider

```typescript
// src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30,   // 30 minutes
    },
  },
})

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
```

### Auth State Hook

```typescript
// src/hooks/useAuth.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, session, loading }
}
```

### Email Template

```typescript
// src/emails/test-reminder.tsx
import { Html, Head, Body, Container, Text, Button } from '@react-email/components'

interface TestReminderEmailProps {
  userName: string
  controlName: string
  dueDate: string
  testUrl: string
}

export function TestReminderEmail({ userName, controlName, dueDate, testUrl }: TestReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f4f4f5' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Text>Hi {userName},</Text>
          <Text>
            You have a control test due for <strong>{controlName}</strong> by {dueDate}.
          </Text>
          <Button
            href={testUrl}
            style={{ backgroundColor: '#f97316', color: '#fff', padding: '12px 24px' }}
          >
            Complete Test
          </Button>
        </Container>
      </Body>
    </Html>
  )
}
```

### Cron Job API Route

```typescript
// src/api/cron/test-reminders.ts
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/render'
import { TestReminderEmail } from '@/emails/test-reminder'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role for admin access
)

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Get upcoming tests
  const { data: tests } = await supabase
    .from('control_tests')
    .select('*, users(email, name), controls(name)')
    .eq('status', 'pending')
    .lte('due_date', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString())

  // Send reminder emails
  for (const test of tests ?? []) {
    await resend.emails.send({
      from: 'RiskGuard <noreply@yourdomain.com>',
      to: test.users.email,
      subject: `Test Reminder: ${test.controls.name}`,
      react: TestReminderEmail({
        userName: test.users.name,
        controlName: test.controls.name,
        dueDate: test.due_date,
        testUrl: `https://yourdomain.com/tests/${test.id}`,
      }),
    })
  }

  return Response.json({ sent: tests?.length ?? 0 })
}
```

---

## Version Compatibility Matrix

| Package | Min Version | Max Version | Notes |
|---------|-------------|-------------|-------|
| React | 18.0.0 | 19.x | React Query 5 requires React 18+ |
| TypeScript | 5.0.0 | 5.7.x | Supabase types require TS 5+ |
| Node.js | 18.0.0 | 22.x | Vercel functions require Node 18+ |
| Vite | 5.0.0 | 6.x | Zero-config Vercel support |
| @supabase/supabase-js | 2.40.0 | 2.x | Required for SSR package compatibility |

---

## Migration Path from LocalStorage

### Phase 1: Auth + Schema
1. Set up Supabase project
2. Create database schema mirroring Zustand stores
3. Add RLS policies with tenant_id
4. Implement Supabase Auth with email/password

### Phase 2: Data Migration
1. Add React Query provider
2. Create hooks for each data type (risks, controls, tests)
3. Migrate from Zustand persist (localStorage) to React Query (Supabase)
4. Keep Zustand for UI state only

### Phase 3: Email + Cron
1. Set up Resend with verified domain
2. Create email templates in React Email
3. Configure Vercel cron jobs
4. Implement reminder and alert flows

---

## Sources

### Supabase (HIGH Confidence)
- [Supabase Auth React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Row Level Security Guide](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Custom Claims and RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [TypeScript Type Generation](https://supabase.com/docs/guides/api/rest/generating-types)
- [Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)
- [Edge Functions Architecture](https://supabase.com/docs/guides/functions/architecture)
- [Multi-Tenant RLS Guide (AntStack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)

### Resend (HIGH Confidence)
- [Send with Vercel Functions](https://resend.com/docs/send-with-vercel-functions)
- [React Email 5.0 Announcement](https://resend.com/blog/react-email-5)
- [Vercel Integration](https://resend.com/blog/vercel-integration)
- [React Email Documentation](https://react.email/docs/integrations/resend)

### Vercel (HIGH Confidence)
- [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite)
- [Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Cron Jobs Quickstart](https://vercel.com/docs/cron-jobs/quickstart)
- [Connection Pooling Guide](https://vercel.com/guides/connection-pooling-with-serverless-functions)

### React Query + Supabase (HIGH Confidence)
- [Supabase Cache Helpers](https://supabase-cache-helpers.vercel.app/postgrest/subscriptions)
- [How to use Supabase with React Query](https://makerkit.dev/blog/saas/supabase-react-query)
- [Next.js + TanStack Query + Supabase Guide](https://silvestri.co/blog/nextjs-tanstack-query-supabase-guide)

### Zustand (HIGH Confidence)
- [Persisting Store Data](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
- [Custom Storage for Supabase Sync](https://github.com/pmndrs/zustand/discussions/2284)

---

## v1.0 Stack (Unchanged)

The following technologies from v1.0 remain validated and unchanged:

| Technology | Version | Purpose |
|------------|---------|---------|
| React | ^19.0.0 | UI Framework |
| TypeScript | ~5.7.2 | Type Safety |
| Vite | ^6.2.0 | Build Tool |
| Tailwind CSS | ^4.1.18 | Styling |
| Zustand | ^5.0.10 | Client State (UI only in v2.0) |
| @tanstack/react-table | ^8.21.3 | Data Tables |
| @tanstack/react-virtual | ^3.13.18 | Virtualization |
| lucide-react | ^0.562.0 | Icons |
| clsx | ^2.1.1 | Conditional Classes |
| date-fns | ^4.1.0 | Date Utilities |
| recharts | ^3.6.0 | Charts |
| motion | ^12.29.0 | Animations |
| sonner | ^2.0.7 | Toasts |
| Radix UI | various | Accessible Primitives |

---

*Stack research for: RiskGuard ERM v2.0 Backend*
*Researched: 2026-01-24*
*Confidence: HIGH - All versions verified via npm registry + official documentation*
