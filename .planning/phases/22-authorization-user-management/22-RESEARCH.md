# Phase 22: Authorization & User Management - Research

**Researched:** 2026-01-24
**Domain:** Supabase RBAC + User Invitation + Profile Management
**Confidence:** HIGH

## Summary

Phase 22 builds upon the authentication foundation from Phase 21 to implement five-role authorization with database-level enforcement via RLS policies, a Director-managed user invitation system with 7-day expiring links, and user profile management including soft-disable functionality.

The existing codebase has critical foundation pieces in place: `profiles` table with role column (director, manager, risk-manager, control-owner, control-tester), `public.tenant_id()` and `public.user_role()` helper functions for RLS policies, and AuthContext providing `role` via `app_metadata`. The existing `usePermissions` hook provides a pattern for role-based UI rendering that needs to be connected to the real role from AuthContext instead of the demo `selectedRole`.

Key findings: (1) Supabase's built-in `inviteUserByEmail` has a 24-hour token expiry limit, so a custom `pending_invitations` table is required for 7-day expiry; (2) Role-based RLS policies should use the `public.user_role()` function that already exists; (3) User deactivation should use the `is_active` column already in profiles, NOT Supabase Auth's ban/soft-delete; (4) Profile updates for users editing their own name/password use standard Supabase Auth APIs.

**Primary recommendation:** Create a custom invitation flow with `pending_invitations` table, Edge Function for sending invite emails via Resend, and acceptance flow that creates the user and sets their role in app_metadata.

## Standard Stack

The established libraries/tools for this phase.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.91.1 | Supabase client SDK | Already installed. Auth admin methods for user management. |
| `resend` | ^6.8.0 | Email API | From STACK.md. Sends invitation emails from Edge Functions. |
| `@react-email/components` | ^0.3.0 | Email templates | From STACK.md. React components for invitation email. |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | ^4.3.6 | Runtime validation | Already installed. Validate invitation forms, profile updates. |
| `uuid` | ^9.0.0 | Token generation | Generate secure invitation tokens for custom flow. |

### What NOT to Use

| Instead of | Don't Use | Reason |
|------------|-----------|--------|
| Custom invitation table | `inviteUserByEmail` only | Built-in has 24h limit, cannot customize to 7 days |
| `is_active` in profiles | `auth.admin.deleteUser(soft: true)` | Soft-delete is irreversible, we need re-enable capability |
| `user_metadata` for role | - | Already correct: role is in `app_metadata` |
| Client-side role check only | - | Must enforce with RLS; UI is convenience, not security |

**Installation (new dependencies only):**
```bash
npm install uuid@^9.0.0
```

Note: `resend` and `@react-email/components` will be used in Edge Functions, not client bundle.

## Architecture Patterns

### Recommended Project Structure (Phase 22 additions)

```
src/
  components/
    admin/
      UserManagement.tsx        # Director view: invite, list, deactivate users
      InviteUserDialog.tsx      # Modal for sending invitations
      UserRow.tsx               # User list item with actions
    profile/
      ProfilePage.tsx           # User's own profile (name, password)
  hooks/
    usePermissions.ts           # UPDATE: Connect to real AuthContext role
    useUserManagement.ts        # Hooks for admin user operations
  lib/
    permissions.ts              # Permission constants and role hierarchy

supabase/
  migrations/
    00008_pending_invitations.sql    # Invitation table for 7-day tokens
    00009_rls_role_policies.sql      # Role-based RLS policies per table
    00010_user_management_functions.sql  # Functions for invite/deactivate
  functions/
    send-invitation/
      index.ts                  # Edge Function: send invite email via Resend

src/
  emails/
    invitation.tsx              # React Email template for invitations
```

### Pattern 1: Custom Invitation Table with 7-Day Expiry

**What:** Store pending invitations in a dedicated table with configurable expiry, bypassing Supabase Auth's 24-hour limit.
**When to use:** All user invitations from Director role.
**Why:** Supabase's `inviteUserByEmail` has a hardcoded 24-hour OTP expiry. Custom table allows 7-day expiry per requirements.

```sql
-- supabase/migrations/00008_pending_invitations.sql

CREATE TABLE public.pending_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN (
    'manager', 'risk-manager', 'control-owner', 'control-tester'
  )),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_pending_email_tenant UNIQUE (tenant_id, email)
);

-- Index for token lookup (used during acceptance)
CREATE INDEX idx_pending_invitations_token ON public.pending_invitations(token);
CREATE INDEX idx_pending_invitations_tenant ON public.pending_invitations(tenant_id);

-- Enable RLS
ALTER TABLE public.pending_invitations ENABLE ROW LEVEL SECURITY;

-- Directors can manage invitations in their tenant
CREATE POLICY "directors_manage_invitations" ON public.pending_invitations
  FOR ALL TO authenticated
  USING (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'director'
  )
  WITH CHECK (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'director'
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pending_invitations TO authenticated;
```

### Pattern 2: Role-Based RLS Policies

**What:** RLS policies that check user role from JWT `app_metadata` for fine-grained access control.
**When to use:** Every table that needs role-specific permissions (not just tenant isolation).
**Why:** Database-level enforcement prevents bypassing via direct API calls.

```sql
-- supabase/migrations/00009_rls_role_policies.sql
-- Example: Controls table with role-based access

-- Drop existing tenant-only policy if exists, add role-aware policy
DROP POLICY IF EXISTS "controls_tenant_isolation" ON public.controls;

-- Director and Manager: Full CRUD
CREATE POLICY "controls_director_manager_all" ON public.controls
  FOR ALL TO authenticated
  USING (
    tenant_id = public.tenant_id()
    AND public.user_role() IN ('director', 'manager')
  )
  WITH CHECK (
    tenant_id = public.tenant_id()
    AND public.user_role() IN ('director', 'manager')
  );

-- Risk Manager: Full CRUD (same as above but explicit for clarity)
CREATE POLICY "controls_risk_manager_all" ON public.controls
  FOR ALL TO authenticated
  USING (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'risk-manager'
  )
  WITH CHECK (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'risk-manager'
  );

-- Control Owner: SELECT only (view-only, submits change requests)
CREATE POLICY "controls_control_owner_read" ON public.controls
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'control-owner'
  );

-- Control Tester: SELECT only for assigned controls
CREATE POLICY "controls_tester_assigned_read" ON public.controls
  FOR SELECT TO authenticated
  USING (
    tenant_id = public.tenant_id()
    AND public.user_role() = 'control-tester'
    AND assigned_tester_id = auth.uid()
  );
```

### Pattern 3: User Deactivation via is_active Flag

**What:** Soft-disable users by setting `is_active = false` in profiles table, not using Supabase Auth ban.
**When to use:** Director deactivating a user without deleting data.
**Why:** Supabase Auth soft-delete is irreversible. `is_active` flag allows reactivation.

```sql
-- Add is_active check to all RLS policies
-- Example update to existing policy:

CREATE OR REPLACE FUNCTION public.is_user_active()
RETURNS BOOLEAN AS $$
  SELECT COALESCE(
    (SELECT is_active FROM public.profiles WHERE id = auth.uid()),
    FALSE
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Wrapper policy that checks is_active before any access
-- Apply to ALL tables that use RLS:
CREATE POLICY "require_active_user" ON public.controls
  FOR ALL TO authenticated
  USING (public.is_user_active())
  WITH CHECK (public.is_user_active());
```

### Pattern 4: Edge Function for Invitation Email

**What:** Supabase Edge Function that creates invitation record and sends email via Resend.
**When to use:** Director invites a new user.
**Why:** Server-side function keeps Resend API key secure and can use admin privileges.

```typescript
// supabase/functions/send-invitation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { email, role, tenantId, invitedBy } = await req.json()

  // Create Supabase client with service role for admin operations
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Generate invitation token and insert record
  const { data: invitation, error: insertError } = await supabaseAdmin
    .from('pending_invitations')
    .insert({
      tenant_id: tenantId,
      email,
      role,
      invited_by: invitedBy,
    })
    .select()
    .single()

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), { status: 400 })
  }

  // Send invitation email
  const inviteUrl = `${Deno.env.get('APP_URL')}/accept-invite?token=${invitation.token}`

  const { error: emailError } = await resend.emails.send({
    from: 'RiskGuard <invitations@riskguard.app>',
    to: [email],
    subject: 'You have been invited to RiskGuard',
    html: `
      <h2>You're invited to join RiskGuard</h2>
      <p>You have been invited to join as a ${role.replace('-', ' ')}.</p>
      <p>This invitation expires in 7 days.</p>
      <a href="${inviteUrl}" style="background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
        Accept Invitation
      </a>
    `,
  })

  if (emailError) {
    return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, invitationId: invitation.id }), { status: 200 })
})
```

### Pattern 5: Role-Based UI Rendering with AuthContext

**What:** Connect `usePermissions` hook to real role from AuthContext instead of demo `selectedRole`.
**When to use:** All permission checks in components.
**Why:** Production uses real authenticated role, demo mode uses selector.

```typescript
// src/hooks/usePermissions.ts - UPDATED for Phase 22

import { useAuth } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/uiStore'

export function usePermissions() {
  const { role: authRole } = useAuth()
  const selectedRole = useUIStore((state) => state.selectedRole)

  // Use real auth role in production, fall back to selectedRole for demo
  // isDemoMode could be env var or detected from missing authRole
  const isDemoMode = !authRole
  const role = isDemoMode ? selectedRole : authRole

  const isDirector = role === 'director'
  const isManager = role === 'manager' || isDirector  // Director inherits Manager
  const isRiskManager = role === 'risk-manager' || isManager
  const isControlOwner = role === 'control-owner'
  const isControlTester = role === 'control-tester'

  return {
    // User management - Director only
    canInviteUsers: isDirector,
    canDeactivateUsers: isDirector,
    canAssignRoles: isDirector,
    canViewUserList: isDirector,

    // Edit permissions - Risk Manager and above
    canEditGrossScores: isRiskManager,
    canEditNetScores: isRiskManager,
    canEditControlDefinitions: isRiskManager,
    canEditTaxonomies: isRiskManager,

    // Approval - Manager and above
    canApproveChanges: isManager,
    canRejectChanges: isManager,

    // View restrictions - Tester most restricted
    canViewAll: !isControlTester,
    isControlTester,

    // Profile - All users
    canEditOwnProfile: true,

    // Utilities
    role,
    isDirector,
    isManager,
    isRiskManager,
    isControlOwner,
    isDemoMode,
  }
}
```

### Anti-Patterns to Avoid

- **Client-side permission checks only:** ALWAYS enforce with RLS policies. UI checks are UX, not security.
- **Using `user_metadata` for role:** Already avoided - role MUST be in `app_metadata` (immutable by user).
- **Hardcoding role strings everywhere:** Use constants/enums for roles to prevent typos.
- **Checking role in every component:** Use `usePermissions` hook centrally; components consume boolean flags.
- **Forgetting `is_active` check in RLS:** Deactivated users must be blocked at database level, not just UI.

## Don't Hand-Roll

Problems that look simple but have existing solutions.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password update | Custom password change flow | `supabase.auth.updateUser({ password })` | Supabase handles hashing, validation, session refresh |
| Email update | Custom email change with verification | `supabase.auth.updateUser({ email })` | Supabase sends verification to new email automatically |
| User creation with role | Manual INSERT + metadata setting | Edge Function with `auth.admin.createUser` + `updateUserById` | Service role needed for app_metadata |
| Session invalidation | Manual token tracking | `supabase.auth.admin.signOut` for user | Built-in session management |
| Role hierarchy | Complex permission matrix | Simple role check with inheritance (Director > Manager > RiskManager) | Cleaner code, easier to maintain |

**Key insight:** Supabase Auth admin APIs handle user lifecycle. Custom code manages the invitation flow and role assignment because Supabase doesn't have built-in multi-tenant team invitations.

## Common Pitfalls

### Pitfall 1: Invitation Token in URL Exposed to Logs

**What goes wrong:** Invitation token in query string gets logged by analytics, proxies, server logs. Token can be extracted and used by unauthorized parties.
**Why it happens:** Simple implementation puts token in URL query param.
**How to avoid:** Use short-lived tokens, hash tokens in storage, or use POST-based acceptance flow. For 7-day tokens, consider one-time-use enforcement.
**Warning signs:** Tokens appearing in analytics dashboards, server access logs.

### Pitfall 2: Race Condition on Invitation Acceptance

**What goes wrong:** Two simultaneous requests to accept same invitation both succeed, creating duplicate users or conflicting state.
**Why it happens:** No database-level lock on invitation acceptance.
**How to avoid:** Use database transaction with `FOR UPDATE` lock, or unique constraint on (email, tenant_id) in profiles.
**Warning signs:** Duplicate profile entries, "user already exists" errors after successful acceptance.

### Pitfall 3: Deactivated User Still Has Valid JWT

**What goes wrong:** User is deactivated but their existing JWT is still valid until expiry. They can still access the app.
**Why it happens:** JWTs are stateless; deactivation doesn't invalidate existing tokens.
**How to avoid:** Check `is_active` in RLS policies (database level). For immediate logout, use `supabase.auth.admin.signOut(userId, 'global')`.
**Warning signs:** Deactivated users reporting they can still access the app.

### Pitfall 4: Forgetting to Set app_metadata.role on Invite Acceptance

**What goes wrong:** User accepts invitation, profile is created with role, but JWT doesn't have role claim. RLS policies fail.
**Why it happens:** Profile insert doesn't automatically update JWT claims; need explicit `updateUserById` call.
**How to avoid:** In acceptance Edge Function: (1) create user, (2) update app_metadata with role AND tenant_id, (3) create profile row.
**Warning signs:** New users getting empty results from all queries, "permission denied" errors.

### Pitfall 5: Director Can Escalate Own Role

**What goes wrong:** RLS policy allows Directors to modify any profile including their own role field. Director changes own role to bypass restrictions.
**Why it happens:** Policy doesn't exclude self-modification of role field.
**How to avoid:** Add constraint: users cannot change their own role. Only other Directors can change roles.
**Warning signs:** Audit log showing Directors upgrading their own permissions.

## Code Examples

Verified patterns from official sources.

### Accept Invitation Edge Function

```typescript
// supabase/functions/accept-invitation/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { token, password, fullName } = await req.json()

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Find and validate invitation
  const { data: invitation, error: findError } = await supabaseAdmin
    .from('pending_invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (findError || !invitation) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired invitation' }),
      { status: 400 }
    )
  }

  // 2. Create user in auth.users
  const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: invitation.email,
    password,
    email_confirm: true, // Pre-verified since they clicked invite link
    app_metadata: {
      tenant_id: invitation.tenant_id,
      role: invitation.role,
    },
  })

  if (createError) {
    return new Response(JSON.stringify({ error: createError.message }), { status: 400 })
  }

  // 3. Create profile row
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert({
      id: authData.user.id,
      tenant_id: invitation.tenant_id,
      role: invitation.role,
      full_name: fullName,
      is_active: true,
    })

  if (profileError) {
    // Rollback: delete the auth user
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
    return new Response(JSON.stringify({ error: 'Failed to create profile' }), { status: 500 })
  }

  // 4. Mark invitation as accepted
  await supabaseAdmin
    .from('pending_invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invitation.id)

  return new Response(JSON.stringify({ success: true }), { status: 200 })
})
```

### User Profile Update (Client-Side)

```typescript
// src/hooks/useProfileUpdate.ts
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export function useProfileUpdate() {
  const { user } = useAuth()

  const updateName = async (fullName: string) => {
    if (!user) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    if (error) throw error
  }

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  return { updateName, updatePassword }
}
```

### User Management Table (Director View)

```typescript
// src/components/admin/UserManagement.tsx
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { usePermissions } from '@/hooks/usePermissions'

interface UserProfile {
  id: string
  full_name: string | null
  role: string
  is_active: boolean
  created_at: string
}

export function UserManagement() {
  const { tenantId } = useAuth()
  const { canViewUserList, canDeactivateUsers } = usePermissions()
  const [users, setUsers] = useState<UserProfile[]>([])

  useEffect(() => {
    if (!canViewUserList || !tenantId) return

    const fetchUsers = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, is_active, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (!error && data) setUsers(data)
    }

    fetchUsers()
  }, [tenantId, canViewUserList])

  const toggleUserActive = async (userId: string, currentStatus: boolean) => {
    if (!canDeactivateUsers) return

    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u =>
        u.id === userId ? { ...u, is_active: !currentStatus } : u
      ))
    }
  }

  // ... render user list with deactivate buttons
}
```

### Permission-Gated Component

```typescript
// src/components/common/RequirePermission.tsx
import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'

interface RequirePermissionProps {
  children: ReactNode
  permission: keyof ReturnType<typeof usePermissions>
  fallback?: ReactNode
}

export function RequirePermission({
  children,
  permission,
  fallback = null
}: RequirePermissionProps) {
  const permissions = usePermissions()

  if (!permissions[permission]) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Usage:
// <RequirePermission permission="canInviteUsers">
//   <InviteUserButton />
// </RequirePermission>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `inviteUserByEmail` for team invites | Custom invitation table + Edge Function | Current | Allows custom expiry, multi-tenant |
| Checking role in every component | Centralized `usePermissions` hook | Current | Cleaner code, single source of truth |
| `user_metadata` for role | `app_metadata` for role | 2024+ | Security: users cannot self-modify |
| Ban user with Supabase Auth | `is_active` flag in profiles | Current | Reversible deactivation |

**Deprecated/outdated:**
- `@supabase/auth-helpers-react` - Use `@supabase/ssr` (already in place from Phase 21)
- Storing role in `user_metadata` - Security vulnerability

## Open Questions

Things that couldn't be fully resolved.

1. **Resend domain setup**
   - What we know: Need subdomain like `mail.riskguard.app` for deliverability
   - What's unclear: Is domain already verified in Resend? DNS records configured?
   - Recommendation: Verify Resend configuration in Phase 23 (Email & Scheduling), use Resend sandbox for Phase 22 development

2. **Director bootstrap problem**
   - What we know: Directors create other users, but who creates the first Director?
   - What's unclear: Should tenant creation include Director creation? Manual via Supabase dashboard?
   - Recommendation: Phase 24 (Demo Seeders) handles initial tenant + Director setup. For now, assume Director exists.

3. **Invitation email template customization**
   - What we know: React Email templates work in Edge Functions
   - What's unclear: Should templates be per-tenant customizable?
   - Recommendation: Start with single template. Tenant customization is future enhancement.

## Sources

### Primary (HIGH confidence)
- [Supabase JavaScript Auth Admin Reference](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail) - inviteUserByEmail API
- [Supabase updateUserById Reference](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid) - Setting app_metadata
- [Supabase Custom Claims & RBAC](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) - RLS with role claims
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) - RLS policy patterns

### Secondary (MEDIUM confidence)
- [How to implement RLS for team invite system](https://boardshape.com/engineering/how-to-implement-rls-for-a-team-invite-system-with-supabase) - Custom invitation table pattern
- [Supabase GitHub Discussion #6055](https://github.com/orgs/supabase/discussions/6055) - Team member implementation
- [React Role-Based Access Control](https://www.permit.io/blog/implementing-react-rbac-authorization) - UI permission patterns

### Project Context
- `.planning/phases/21-database-auth-foundation/21-RESEARCH.md` - Foundation patterns
- `.planning/research/PITFALLS.md` - Security pitfalls S1-S20
- `src/hooks/usePermissions.ts` - Existing permission hook pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Building on Phase 21 foundation
- Invitation flow: HIGH - Custom table pattern verified with multiple sources
- RLS role policies: HIGH - Official Supabase documentation
- UI patterns: HIGH - Existing codebase patterns established

**Research date:** 2026-01-24
**Valid until:** 60 days (patterns stable, building on Phase 21)
