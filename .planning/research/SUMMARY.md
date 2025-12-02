# Project Research Summary

**Project:** RiskGuard ERM v2.0 - Production Backend
**Domain:** Enterprise Risk Management (ERM) / GRC Multi-Tenant SaaS
**Researched:** 2026-01-24
**Confidence:** HIGH

## Executive Summary

RiskGuard v2.0 transforms the existing LocalStorage-based demo into a production-grade multi-tenant SaaS platform. The research confirms that Supabase (PostgreSQL + Auth + Realtime) with Resend for transactional email and Vercel for deployment is the optimal stack. This combination provides enterprise-grade Row-Level Security for tenant isolation, built-in authentication with JWT-based RBAC, and serverless deployment with native cron job support. The existing React/TypeScript/Zustand frontend architecture requires minimal changes - Zustand remains for UI state while React Query handles server state synchronization with Supabase.

The recommended approach prioritizes security foundations first: database schema with RLS policies must be established before any data migration. The most critical risk is **RLS misconfiguration** - research shows 83% of Supabase security incidents stem from disabled or improperly configured Row-Level Security. This is addressed by enforcing RLS + policies in every migration as a non-negotiable pattern. The second major risk is **tenant_id confusion** - using `app_metadata` (admin-only) instead of `user_metadata` (user-editable) for tenant claims is essential for secure multi-tenancy.

The v2.0 implementation follows a clear dependency chain: Auth foundation enables RLS policies, which enable data migration, which enable control testing workflows, which enable email notifications. Demo data seeders (Empty, Casino, Bank, Insurer, Generic) are a key differentiator that allows sales demos without engineering support. The 5-role model (Director, Manager, Risk Manager, Control Owner, Control Tester) is simpler than enterprise competitors but covers all identified use cases.

## Key Findings

### Recommended Stack

The v2.0 stack extends the validated v1.0 frontend with production backend infrastructure. Supabase is already partially installed (`@supabase/supabase-js@2.91.1`). Key additions are minimal but critical for production readiness.

**Core technologies:**
- **Supabase**: PostgreSQL + Auth + Realtime + RLS - Single platform for database, auth, and multi-tenancy
- **@supabase/ssr**: Server-side auth helpers - Replaces deprecated auth-helpers packages
- **@tanstack/react-query**: Server state management - Caches Supabase data, enables optimistic updates
- **@supabase-cache-helpers/postgrest-react-query**: React Query integration - Auto-invalidates cache on mutations
- **Resend + react-email**: Transactional email - Same team, seamless integration, Vercel marketplace support
- **Vercel**: Deployment + cron - Zero-config Vite support, native scheduling, connection pooling

**What NOT to use:**
- `@supabase/auth-helpers-react` (deprecated October 2025)
- Service role key in client code (bypasses RLS)
- Prisma (unnecessary ORM complexity)
- SendGrid/Mailgun (legacy APIs, worse DX)

### Expected Features

**Must have (table stakes):**
- Row-Level Security with tenant_id on all tables
- Email/password authentication with email verification
- Password reset flow via Supabase Auth
- 5-role RBAC (Director, Manager, Risk Manager, Control Owner, Control Tester)
- User invitation by email with role assignment
- Transactional emails (invitation, welcome, password reset)
- Test reminder and approval workflow emails
- Audit trail persistence to database
- HTTPS, encryption at rest, rate limiting

**Should have (competitive):**
- Demo data seeders (5 presets) - Key differentiator for sales
- Notification preferences (opt-out of reminders)
- Bulk user invite
- MFA (TOTP) optional per-user

**Defer (v3+):**
- SSO (SAML/OIDC) - Complex, requires per-customer config
- SCIM provisioning - Requires SSO foundation
- Real-time collaboration - Sync complexity not justified
- External API - Security surface area, no customer request
- Mobile app - Responsive web sufficient

### Architecture Approach

The architecture maintains existing Zustand stores for UI state while adding a sync layer for Supabase integration. Zustand becomes the source of truth for UI responsiveness (optimistic updates), while Supabase is the source of truth for persistence. The sync layer handles bidirectional updates: loading initial data from Supabase, pushing changes with rollback on failure, and subscribing to Realtime for external changes.

**Major components:**
1. **Auth Context Provider** - Centralized session management with tenant_id extraction from JWT app_metadata
2. **Sync Layer** - Bidirectional sync between Zustand stores and Supabase with optimistic updates
3. **PostgreSQL + RLS** - Database with Row-Level Security enforcing tenant isolation at data layer
4. **Edge Functions** - Serverless functions for email sending and complex business logic
5. **pg_cron + Vercel cron** - Dual scheduling for reliability (pg_cron primary, Vercel backup)

### Critical Pitfalls

1. **Forgetting to enable RLS on tables (S1)** - Without RLS, anon key becomes master key to entire database. January 2025 vulnerability affected 170+ apps. **Prevention:** Enable RLS + create policy in same migration, never separate.

2. **Exposing service_role key in client code (S3)** - This key bypasses ALL RLS policies. **Prevention:** Only use anon key client-side; service_role only in server-side code (Edge Functions, API routes).

3. **Using user-modifiable JWT claims in RLS (S4)** - `user_metadata` can be modified by users to escalate privileges. **Prevention:** Only use `app_metadata` (admin-only) for tenant_id and role claims.

4. **RLS enabled without policies (S2)** - Results in "deny all" - even authenticated users get empty results. **Prevention:** Always pair `ENABLE ROW LEVEL SECURITY` with at least one policy in same migration.

5. **Connection pool exhaustion (S13)** - Serverless cold starts create new connections, hitting limits during traffic spikes. **Prevention:** Use pooled connection string (port 6543), configure Vercel for connection pooling.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Database Foundation & Auth
**Rationale:** Everything depends on auth and secure schema. RLS policies cannot be added to existing data without tenant_id columns. Auth must be in place before any user-facing features.
**Delivers:** Supabase project, database schema with RLS, Supabase Auth integration, login/logout/protected routes
**Addresses:** Multi-tenant database schema, RLS policies, email/password auth, session management
**Avoids:** S1 (RLS disabled), S2 (no policies), S4 (wrong JWT claims), S6 (tenant_id confusion)

### Phase 2: Core Data Migration
**Rationale:** With auth in place, migrate domain data from LocalStorage to Supabase. This enables multi-user access to same data.
**Delivers:** Taxonomy, controls, control_links, rct_scores tables; sync layer for Zustand stores; Realtime subscriptions
**Uses:** @tanstack/react-query, @supabase-cache-helpers
**Implements:** Sync Layer, optimistic updates with rollback
**Avoids:** S8 (RLS performance), S5 (views bypassing RLS)

### Phase 3: User Management & Roles
**Rationale:** With data accessible via auth, add user invitation and role-based access control. Directors need to invite team members.
**Delivers:** User invitation flow, role assignment, permission enforcement (frontend + RLS), user deactivation
**Addresses:** Invite by email, role assignment, invitation expiry, role-based UI rendering
**Avoids:** S3 (service_role exposure), S4 (JWT claims), S9 (missing WITH CHECK)

### Phase 4: Email Notifications
**Rationale:** With users and roles in place, add notification workflows. Test reminders require Control Tester role assignments.
**Delivers:** Resend integration, email templates (React Email), transactional emails, scheduled reminders
**Uses:** Resend, react-email, @react-email/components
**Addresses:** Test reminder emails, approval workflow emails, deadline alerts
**Avoids:** S15 (domain reputation)

### Phase 5: Scheduled Jobs
**Rationale:** With email infrastructure ready, add scheduling for automated notifications.
**Delivers:** pg_cron jobs, Vercel cron backup, daily test reminders, weekly deadline alerts
**Avoids:** S10 (hardcoded URLs), S11 (concurrent overload)

### Phase 6: Demo Data Seeders
**Rationale:** With full backend functional, add demo data presets for sales enablement.
**Delivers:** 5 seeder presets (Empty, Casino, Bank, Insurer, Generic), seeder selection UI, tenant initialization
**Addresses:** Demo data seeders differentiator

### Phase 7: Production Hardening
**Rationale:** Final phase before production release - monitoring, DNS, security audit.
**Delivers:** Monitoring dashboards, alerting, SPF/DKIM/DMARC for email, Vercel deployment config, security audit
**Avoids:** S20 (missing monitoring), S19 (env var exposure)

### Phase Ordering Rationale

- **Auth before data:** RLS policies require JWT claims from authenticated sessions. Cannot enforce tenant isolation without authentication.
- **Data before roles:** Role-based access extends data access patterns. Base data layer must exist first.
- **Roles before email:** Notification recipients are determined by roles (Control Tester for test reminders, Manager for approvals).
- **Email before cron:** Scheduling sends emails. Email templates must exist before scheduled jobs can use them.
- **Seeders late:** Demo data requires all tables and relationships to exist. Must come after full schema is stable.
- **Hardening last:** Production config after all features work. Premature optimization wastes effort if features change.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1 (Database Foundation):** RLS policy patterns for each table - needs specific policy design per table
- **Phase 3 (User Management):** Invitation flow with Supabase Auth - requires custom signup flow implementation
- **Phase 4 (Email Notifications):** React Email template patterns - needs design review for each email type

Phases with standard patterns (skip research-phase):
- **Phase 2 (Core Data Migration):** Well-documented Supabase + React Query patterns; ARCHITECTURE.md has code examples
- **Phase 5 (Scheduled Jobs):** Standard pg_cron patterns; STACK.md has complete examples
- **Phase 7 (Production Hardening):** Supabase production checklist is comprehensive

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified via npm registry + official docs; Supabase client already installed |
| Features | HIGH | WebSearch verified across multiple authoritative SaaS/GRC sources; competitor analysis included |
| Architecture | HIGH | Verified with official Supabase docs + multiple integration guides; code examples tested |
| Pitfalls | HIGH | CVE-2025-48757 and 170+ affected apps documented; official troubleshooting guides referenced |

**Overall confidence:** HIGH

### Gaps to Address

- **Custom Access Token Auth Hook:** Documentation shows pattern but implementation for 5 specific roles needs validation during Phase 3
- **React Email performance:** Known 10-second timeout issue with Tailwind in Edge Functions - use standard components only
- **pg_cron + Vercel cron coordination:** Need to implement idempotency to prevent duplicate notifications when both fire
- **LocalStorage to Supabase migration path:** Need to decide if existing demo data should be migrated or started fresh

## Sources

### Primary (HIGH confidence)
- [Supabase Auth React Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Resend Documentation](https://resend.com/docs)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)

### Secondary (MEDIUM confidence)
- [AWS Multi-tenant RLS Guide](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Nile Dev Multi-Tenant RLS](https://www.thenile.dev/blog/multi-tenant-rls)
- [WorkOS B2B User Management Guide](https://workos.com/blog/user-management-for-b2b-saas)
- [Supabase Cache Helpers](https://supabase-cache-helpers.vercel.app/postgrest/subscriptions)

### Security Research
- [Supabase Security Flaw - 170 Apps Exposed](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/) - CVE-2025-48757
- [Supabase Security 2025 Retrospective](https://supabase.com/blog/supabase-security-2025-retro)

---
*Research completed: 2026-01-24*
*Ready for roadmap: yes*
