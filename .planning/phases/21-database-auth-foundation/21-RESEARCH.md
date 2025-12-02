# Phase 21: Database & Auth Foundation - Research

**Researched:** 2026-01-24
**Domain:** Supabase PostgreSQL + Row-Level Security + Authentication
**Confidence:** HIGH

## Summary

Phase 21 establishes the security foundation for multi-tenant SaaS operation. The phase covers three interconnected domains: (1) PostgreSQL database schema with tenant isolation via Row-Level Security (RLS), (2) Supabase Auth for email/password authentication with email verification, and (3) security infrastructure including audit logging, rate limiting, and CORS configuration.

The existing v2.0 research has already validated Supabase as the platform and documented architectural patterns. This phase-specific research focuses on **implementation patterns** that the planner needs to create actionable tasks. Key findings: RLS policies MUST be created in the same migration as table creation (never separate); tenant_id MUST come from `app_metadata` (not `user_metadata`); email verification is enabled by default on hosted Supabase; rate limiting is built-in for auth endpoints but needs explicit configuration for production.

**Primary recommendation:** Create a migration template pattern where every table includes `tenant_id`, `ENABLE ROW LEVEL SECURITY`, and a tenant isolation policy in a single atomic migration file.

## Standard Stack

The established libraries and tools for this phase.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.91.1 | Supabase client SDK | Already installed. Handles auth, database, realtime. |
| `@supabase/ssr` | ^0.8.0 | Server-side auth helpers | Replaces deprecated `@supabase/auth-helpers-*`. Handles cookies and sessions. |
| `supabase` CLI | 2.72.8 | Local dev, migrations, type generation | Already installed. Required for migrations workflow. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^4.3.6 | Runtime validation | Validate auth forms before Supabase calls |

### What NOT to Use

| Instead of | Don't Use | Reason |
|------------|-----------|--------|
| `@supabase/ssr` | `@supabase/auth-helpers-react` | Deprecated October 2025, archived |
| Anon key in client | Service role key | Service role bypasses RLS - security catastrophe |
| `app_metadata` | `user_metadata` for tenant_id | user_metadata is user-editable, allows tenant spoofing |
| Custom session handling | LocalStorage for auth | Supabase handles session persistence automatically |

**Installation (new dependencies only):**
```bash
npm install @supabase/ssr@^0.8.0 zod@^4.3.6
```

## Architecture Patterns

### Recommended Project Structure (Phase 21 additions)

```
src/
  lib/
    supabase/
      client.ts           # Browser Supabase client (anon key)
      types.ts            # Re-export generated database types
  contexts/
    AuthContext.tsx       # Session + tenant_id provider
  components/
    auth/
      LoginForm.tsx       # Email/password login
      SignupForm.tsx      # Registration with email verification
      ResetPassword.tsx   # Password reset request
      ConfirmEmail.tsx    # Email verification handler

supabase/
  migrations/
    00001_tenants.sql           # Tenants table
    00002_profiles.sql          # User profiles with tenant_id
    00003_audit_log.sql         # Audit trail table
    00004_rls_helper_functions.sql  # Helper functions (auth.tenant_id())
    00005_auth_event_logging.sql    # Auth event trigger
  config.toml                   # Local dev config
```

### Pattern 1: Migration Template with RLS

**What:** Every table migration includes tenant_id, RLS enablement, and isolation policy in a single file.
**When to use:** ALL multi-tenant tables (every table except tenants itself).
**Why:** Prevents "RLS enabled without policy" pitfall and ensures isolation is never forgotten.

```sql
-- supabase/migrations/00006_controls.sql
-- TEMPLATE: Table + RLS in same migration

-- 1. Create table with tenant_id
CREATE TABLE public.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  control_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create index on tenant_id (CRITICAL for RLS performance)
CREATE INDEX idx_controls_tenant_id ON public.controls(tenant_id);

-- 3. Enable RLS (ALWAYS in same migration)
ALTER TABLE public.controls ENABLE ROW LEVEL SECURITY;

-- 4. Create tenant isolation policy (ALWAYS in same migration)
CREATE POLICY "tenant_isolation" ON public.controls
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT auth.tenant_id()))
  WITH CHECK (tenant_id = (SELECT auth.tenant_id()));

-- 5. Grant permissions to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.controls TO authenticated;
```

### Pattern 2: Tenant ID Helper Function

**What:** A SQL function that extracts tenant_id from JWT app_metadata, cached per statement.
**When to use:** All RLS policies reference this function instead of raw JWT access.
**Why:** Cleaner policies, single point of change, proper caching for performance.

```sql
-- supabase/migrations/00004_rls_helper_functions.sql

-- Create function in auth schema for consistency with auth.uid()
CREATE OR REPLACE FUNCTION auth.tenant_id()
RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json -> 'app_metadata' ->> 'tenant_id')::uuid,
    NULL
  );
$$ LANGUAGE sql STABLE;

-- Usage in RLS policies:
-- USING (tenant_id = (SELECT auth.tenant_id()))
-- The SELECT wrapper caches the result per statement (performance optimization)
```

### Pattern 3: Auth Context Provider

**What:** React context that provides session, user, and tenant_id to entire app.
**When to use:** Wrap application root. All protected components consume this context.
**Why:** Centralized auth state, automatic session refresh, tenant_id available everywhere.

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

interface AuthContextType {
  session: Session | null
  user: User | null
  tenantId: string | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<{ error: Error | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Extract tenant_id from app_metadata (NOT user_metadata)
  const tenantId = session?.user?.app_metadata?.tenant_id ?? null

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setIsLoading(false)
    })

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })
    return { error }
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      tenantId,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### Pattern 4: Audit Trail Trigger

**What:** PostgreSQL trigger that automatically logs all changes to multi-tenant tables.
**When to use:** Tables that require compliance audit trail (controls, taxonomy, tests).
**Why:** Database-level enforcement ensures audit cannot be bypassed by application bugs.

```sql
-- supabase/migrations/00003_audit_log.sql

-- Audit log table
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_audit_log_tenant_id ON public.audit_log(tenant_id);
CREATE INDEX idx_audit_log_entity_type ON public.audit_log(entity_type);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Tenant isolation (users can only see their own audit logs)
CREATE POLICY "tenant_isolation" ON public.audit_log
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT auth.tenant_id()));

-- Insert policy (system can insert via service role, authenticated via triggers)
CREATE POLICY "insert_audit" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (SELECT auth.tenant_id()));

-- Generic audit function
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (
      tenant_id, entity_type, entity_id, entity_name, change_type, new_data, user_id, user_email
    ) VALUES (
      NEW.tenant_id,
      TG_TABLE_NAME,
      NEW.id,
      COALESCE(NEW.name, NEW.title, NEW.id::text),
      'create',
      to_jsonb(NEW),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (
      tenant_id, entity_type, entity_id, entity_name, change_type, old_data, new_data, user_id, user_email
    ) VALUES (
      NEW.tenant_id,
      TG_TABLE_NAME,
      NEW.id,
      COALESCE(NEW.name, NEW.title, NEW.id::text),
      'update',
      to_jsonb(OLD),
      to_jsonb(NEW),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_log (
      tenant_id, entity_type, entity_id, entity_name, change_type, old_data, user_id, user_email
    ) VALUES (
      OLD.tenant_id,
      TG_TABLE_NAME,
      OLD.id,
      COALESCE(OLD.name, OLD.title, OLD.id::text),
      'delete',
      to_jsonb(OLD),
      auth.uid(),
      (SELECT email FROM auth.users WHERE id = auth.uid())
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Pattern 5: Auth Event Logging

**What:** Log authentication events (login, logout, failed attempts) to audit_log.
**When to use:** Compliance requirement for all production deployments.
**Why:** SEC-02 requirement - track who accessed the system and when.

```sql
-- supabase/migrations/00005_auth_event_logging.sql

-- Create auth_events table (separate from entity audit)
CREATE TABLE public.auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id),  -- nullable for failed logins
  user_id UUID REFERENCES auth.users(id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'login', 'logout', 'login_failed', 'signup', 'password_reset_request', 'password_reset_complete'
  )),
  email TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auth_events_tenant_id ON public.auth_events(tenant_id);
CREATE INDEX idx_auth_events_user_id ON public.auth_events(user_id);
CREATE INDEX idx_auth_events_created_at ON public.auth_events(created_at DESC);

-- RLS
ALTER TABLE public.auth_events ENABLE ROW LEVEL SECURITY;

-- Directors can view auth events for their tenant
CREATE POLICY "tenant_isolation" ON public.auth_events
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT auth.tenant_id()));
```

Note: Auth event logging is triggered from the frontend on auth state changes, not via database triggers, because Supabase Auth events don't fire PostgreSQL triggers directly.

### Anti-Patterns to Avoid

- **Creating table without RLS in same migration:** NEVER separate table creation from RLS enablement. Attackers can exploit the gap.
- **Using `user_metadata` for tenant_id:** Users can modify their own `user_metadata`. Use `app_metadata` only.
- **RLS policies without SELECT for INSERT:** INSERT operations need SELECT permission to return the inserted row.
- **Missing index on tenant_id:** RLS policy evaluated per-row. Without index, full table scan on every query.
- **Hardcoding tenant_id in RLS:** Use `auth.tenant_id()` function for maintainability and caching.

## Don't Hand-Roll

Problems that look simple but have existing solutions.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence | LocalStorage token management | Supabase Auth session handling | Auto-refresh, secure cookie storage, cross-tab sync |
| Password hashing | Custom bcrypt implementation | Supabase Auth | Uses Argon2id, handles salt, upgrade-safe |
| Email verification | Custom token generation | Supabase Auth email templates | Built-in token expiry, rate limiting, templates |
| Password reset | Custom reset flow | `supabase.auth.resetPasswordForEmail()` | Secure token, configurable redirect, rate limited |
| JWT validation | Manual JWT parsing | Supabase client auto-validation | Handles refresh, expiry, signature verification |
| Rate limiting auth | Custom rate limiting | Supabase built-in rate limits | IP-based, configurable, CAPTCHA support |

**Key insight:** Supabase Auth handles the entire authentication lifecycle. Custom code should only orchestrate the UI flow, not implement security logic.

## Common Pitfalls

### Pitfall 1: RLS Enabled Without Policies

**What goes wrong:** RLS is enabled but no policies are created. Result: "deny all" - even authenticated users get empty results.
**Why it happens:** Developers enable RLS to "be secure" without creating accompanying policies.
**How to avoid:** Use migration template that includes RLS enablement AND policy in same file. Never commit a migration with just `ENABLE ROW LEVEL SECURITY`.
**Warning signs:** Queries returning empty results for authenticated users. Supabase dashboard showing "No policies" on RLS-enabled tables.

### Pitfall 2: Missing WITH CHECK on UPDATE Policy

**What goes wrong:** UPDATE policy has only USING clause. Users can modify rows to change tenant_id, stealing data to their own tenant.
**Why it happens:** USING is required, WITH CHECK is "optional" and often forgotten.
**How to avoid:** Always use combined policy with both clauses:
```sql
CREATE POLICY "tenant_isolation" ON table
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT auth.tenant_id()))
  WITH CHECK (tenant_id = (SELECT auth.tenant_id()));
```
**Warning signs:** Users able to change tenant_id or owner fields on rows.

### Pitfall 3: Email Verification Not Enforced in UI

**What goes wrong:** Supabase Auth sends verification email, but app doesn't check `email_confirmed_at` before allowing access.
**Why it happens:** Developers assume Supabase blocks unverified users automatically. It doesn't by default.
**How to avoid:** Check `user.email_confirmed_at` in AuthContext. Redirect unverified users to "check your email" page.
**Warning signs:** Users accessing app without clicking verification link.

### Pitfall 4: Session Expiry Not Handled

**What goes wrong:** JWT expires but app continues to show authenticated state. Database calls fail with 401.
**Why it happens:** Not subscribing to `onAuthStateChange` or not handling `TOKEN_REFRESHED` / `SIGNED_OUT` events.
**How to avoid:** Use AuthContext pattern with `onAuthStateChange` subscription. Handle auth errors in API calls.
**Warning signs:** Random 401 errors after user has been logged in for a while.

### Pitfall 5: Hardcoded URLs in Password Reset

**What goes wrong:** Password reset email contains wrong redirect URL in production.
**Why it happens:** `redirectTo` hardcoded to localhost during development.
**How to avoid:** Use `window.location.origin` for redirect URL:
```typescript
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${window.location.origin}/auth/reset-password`,
})
```
**Warning signs:** Password reset links going to wrong domain.

## Code Examples

Verified patterns for Phase 21 implementation.

### Supabase Client Setup

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
```

### Protected Route Component

```typescript
// src/components/auth/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  requireVerified?: boolean
}

export function ProtectedRoute({ children, requireVerified = true }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div>Loading...</div> // Or skeleton
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // AUTH-02: Require email verification before app access
  if (requireVerified && !user.email_confirmed_at) {
    return <Navigate to="/verify-email" replace />
  }

  return <>{children}</>
}
```

### Login Form with Zod Validation

```typescript
// src/components/auth/LoginForm.tsx
import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '@/contexts/AuthContext'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validate with Zod
    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      setError(result.error.errors[0].message)
      return
    }

    setIsLoading(true)
    const { error } = await signIn(email, password)
    setIsLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="text-red-600">{error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        disabled={isLoading}
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        disabled={isLoading}
      />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

### Email Verification Handler

```typescript
// src/components/auth/ConfirmEmail.tsx
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'

export function ConfirmEmail() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const verifyEmail = async () => {
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')

      if (!tokenHash || type !== 'email') {
        setStatus('error')
        setError('Invalid verification link')
        return
      }

      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      })

      if (error) {
        setStatus('error')
        setError(error.message)
        return
      }

      setStatus('success')
      // Redirect to app after short delay
      setTimeout(() => navigate('/'), 2000)
    }

    verifyEmail()
  }, [searchParams, navigate])

  if (status === 'verifying') return <div>Verifying your email...</div>
  if (status === 'error') return <div>Error: {error}</div>
  return <div>Email verified! Redirecting...</div>
}
```

### Database Schema: Tenants Table

```sql
-- supabase/migrations/00001_tenants.sql

-- Tenants table (root of multi-tenancy)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- No RLS on tenants table - access controlled via profiles
-- Service role manages tenant creation
```

### Database Schema: Profiles Table

```sql
-- supabase/migrations/00002_profiles.sql

-- User profiles extending auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'control-owner' CHECK (role IN (
    'director', 'manager', 'risk-manager', 'control-owner', 'control-tester'
  )),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_profiles_tenant_id ON public.profiles(tenant_id);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can read profiles in their tenant
CREATE POLICY "tenant_read" ON public.profiles
  FOR SELECT TO authenticated
  USING (tenant_id = (SELECT auth.tenant_id()));

-- Users can update their own profile
CREATE POLICY "self_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = (SELECT auth.tenant_id()));
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@supabase/auth-helpers-react` | `@supabase/ssr` | October 2025 | Auth helpers deprecated, SSR package is replacement |
| Anon + service_role keys | New publishable key format | 2025-2026 | `sb_publishable_xxx` format rolling out |
| Manual CORS headers | Built-in CORS for Data API | Current | PostgREST handles CORS automatically |
| `user_metadata` for custom claims | `app_metadata` via Auth Hooks | Current | Security best practice for immutable claims |

**Deprecated/outdated:**
- `@supabase/auth-helpers-react` - Archived October 2025, use `@supabase/ssr`
- Storing tenant_id in `user_metadata` - Security vulnerability, use `app_metadata`
- Manual JWT parsing in RLS - Use `auth.jwt()` and helper functions

## Open Questions

Things that require resolution during implementation.

1. **Tenant creation flow for Phase 21**
   - What we know: Tenants table needs to exist before users can be assigned
   - What's unclear: How is first tenant created? Admin script? First user signup creates tenant?
   - Recommendation: For Phase 21, create tenant via Supabase dashboard or SQL. Phase 24 (Demo Seeders) handles proper tenant initialization UI.

2. **Setting app_metadata.tenant_id on signup**
   - What we know: Custom Access Token Auth Hook can inject claims
   - What's unclear: Hook requires user to already exist with tenant_id in profiles. Chicken-and-egg.
   - Recommendation: Use database trigger on profiles insert to update auth.users app_metadata, OR use Edge Function for signup that handles both profile creation and metadata setting.

3. **Auth event logging client IP**
   - What we know: SEC-02 requires logging auth events including failed attempts
   - What's unclear: Client IP not available directly in browser. Edge Function needed?
   - Recommendation: Log what's available client-side (user_agent, timestamp). Consider Edge Function for richer logging if compliance requires IP.

## Sources

### Primary (HIGH confidence)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Auth React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Supabase Password-based Auth](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac)
- [Supabase Auth Rate Limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase Postgres Triggers](https://supabase.com/docs/guides/database/postgres/triggers)

### Secondary (MEDIUM confidence)
- [Multi-Tenant RLS Patterns (AntStack)](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)
- [Supabase Best Practices (Leanware)](https://www.leanware.co/insights/supabase-best-practices)
- [Supabase CORS Guide (Bootstrapped)](https://bootstrapped.app/guide/how-to-configure-cors-in-supabase)
- [Audit Trail for Supabase (Medium)](https://medium.com/@harish.siri/simpe-audit-trail-for-supabase-database-efefcce622ff)

### Project Research (Already Validated)
- `.planning/research/v2-ARCHITECTURE.md` - System architecture and data flow
- `.planning/research/STACK.md` - Technology stack decisions
- `.planning/research/PITFALLS.md` - Security pitfalls S1-S20
- `.planning/research/SUMMARY.md` - Executive summary and roadmap implications

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Already installed packages, official docs verified
- Architecture patterns: HIGH - Patterns from official Supabase docs and validated research
- Pitfalls: HIGH - CVE-2025-48757 documented, production checklist verified

**Research date:** 2026-01-24
**Valid until:** 60 days (Supabase patterns stable, auth-helpers deprecation complete)

---
*Research for Phase 21: Database & Auth Foundation*
*Project: RiskGuard ERM v2.0*
