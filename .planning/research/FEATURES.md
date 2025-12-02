# Feature Landscape: Production Multi-Tenant SaaS Backend

**Domain:** Production SaaS Backend (Multi-tenancy, Auth, Notifications, User Management)
**Project:** RiskGuard ERM v2.0
**Researched:** 2026-01-24
**Confidence:** HIGH (WebSearch verified with multiple authoritative sources)

---

## Executive Summary

This research covers what features are expected for a production-grade multi-tenant SaaS platform with email notifications. RiskGuard v1.0 delivered the ERM functionality (risk taxonomies, control testing, etc.); v2.0 must add the **backend infrastructure** that makes it a real SaaS product: multi-tenancy, authentication, authorization, email notifications, and user management.

The research identifies:
- **Table stakes:** Features every production SaaS must have (security, data isolation, transactional email)
- **Differentiators:** Features that improve UX but are not strictly required (notification preferences, demo data seeders)
- **Anti-features:** Features to deliberately NOT build in v2.0 (SSO, real-time sync, mobile app)

---

## Table Stakes (Must Have for Production SaaS)

Features users expect from any production SaaS. Missing these = not ready for production.

### Multi-Tenancy & Data Isolation

| Feature | Why Expected | Complexity | Implementation Notes |
|---------|--------------|------------|---------------------|
| **Row-Level Security (RLS)** | Database-enforced tenant isolation; prevents cross-tenant data leaks | MEDIUM | PostgreSQL RLS policies on all tables with `tenant_id`; use `app.current_tenant` session variable |
| **Tenant-scoped queries** | Every query must respect tenant boundaries | LOW | RLS handles this automatically; no WHERE clauses needed in application code |
| **Tenant identifier on all tables** | Required for RLS to function | LOW | Add `tenant_id UUID NOT NULL` to every shared table; index for performance |
| **Composite indexing** | Performance for filtered queries | LOW | Index `(tenant_id, frequently_queried_columns)` |
| **Superuser bypass protection** | RLS bypassed by superusers/table owners; application must use restricted role | MEDIUM | Create `app_user` role without BYPASSRLS; application connects as this role |

**Source:** [AWS Database Blog - Multi-tenant data isolation with PostgreSQL Row Level Security](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/), [Nile Dev - Shipping multi-tenant SaaS using Postgres Row-Level Security](https://www.thenile.dev/blog/multi-tenant-rls)

### Authentication

| Feature | Why Expected | Complexity | Implementation Notes |
|---------|--------------|------------|---------------------|
| **Email/password authentication** | Basic auth method; required for all users | LOW | Supabase Auth handles this out of the box |
| **Email verification** | Prevents fake accounts; required before accessing workspace | LOW | Supabase Auth built-in; send verification link on signup |
| **Password reset flow** | Users forget passwords; essential self-service | LOW | Supabase Auth built-in; transactional email with reset link |
| **Secure session management** | JWT tokens with refresh; auto-logout on expiry | LOW | Supabase Auth handles tokens; configure session duration |
| **MFA (optional for v2.0)** | Two-factor authentication for security-conscious users | MEDIUM | Supabase Auth supports TOTP; can enable per-user |

**Source:** [Descope - SaaS Authentication: Key Considerations & Best Practices](https://www.descope.com/blog/post/saas-auth), [Valence Security - SaaS Security Best Practices 2025](https://www.valencesecurity.com/resources/blogs/saas-security-best-practices-and-strategies-for-2025)

### Authorization (Role-Based Access Control)

| Feature | Why Expected | Complexity | Implementation Notes |
|---------|--------------|------------|---------------------|
| **RBAC with defined roles** | Control who can do what; enterprise requirement | MEDIUM | 5 roles: Director, Manager, Risk Manager, Control Owner, Control Tester |
| **Permission per operation** | Granular control (view, edit, delete, approve) | MEDIUM | Define permissions matrix for each role |
| **Tenant-scoped roles** | Role assignment is per-tenant, not global | LOW | Store role in `tenant_users` table with `(tenant_id, user_id, role)` |
| **Least privilege principle** | Users only get access they need | LOW | Default to minimal permissions; explicitly grant additional access |
| **Role-based UI rendering** | Hide features users cannot access | MEDIUM | Frontend checks user role before rendering actions |

**Source:** [WorkOS - The complete guide to user management for B2B SaaS](https://workos.com/blog/user-management-for-b2b-saas), [Frontegg - Roles and Permissions Handling in SaaS Applications](https://frontegg.com/guides/roles-and-permissions-handling-in-saas-applications)

**RiskGuard Role Matrix (v2.0):**

| Permission | Director | Manager | Risk Manager | Control Owner | Control Tester |
|------------|----------|---------|--------------|---------------|----------------|
| Invite/manage users | YES | NO | NO | NO | NO |
| Approve changes (four-eye) | YES | YES | NO | NO | NO |
| Edit risks/controls | YES | YES | YES | NO | NO |
| Request changes | YES | YES | YES | YES | NO |
| View all data | YES | YES | YES | YES (limited) | NO |
| Test assigned controls | YES | YES | YES | YES | YES |
| See only assigned controls | NO | NO | NO | NO | YES |

### User Invitation & Management

| Feature | Why Expected | Complexity | Implementation Notes |
|---------|--------------|------------|---------------------|
| **Invite by email** | Director invites users; standard B2B pattern | MEDIUM | Send invitation email with unique link; user creates password on first visit |
| **Role assignment on invite** | Director specifies role when inviting | LOW | Store pending role in `invitations` table; apply on signup |
| **Invitation expiry** | Links expire for security (e.g., 7 days) | LOW | Store `expires_at` timestamp; reject expired links |
| **Invitation revocation** | Cancel pending invites | LOW | Soft-delete or status column on `invitations` table |
| **User deactivation** | Disable users without deleting data | LOW | `is_active` flag on `tenant_users`; revoke sessions |
| **Self-service profile** | Users update their own name, avatar, password | LOW | Profile settings page; Supabase Auth for password change |

**Source:** [UserPilot - How to Onboard Invited Users to your SaaS Product](https://userpilot.com/blog/onboard-invited-users-saas/), [Auth0 - User Onboarding Strategies in B2B SaaS](https://auth0.com/blog/user-onboarding-strategies-b2b-saas/)

### Transactional Email Notifications

| Feature | Why Expected | Complexity | Implementation Notes |
|---------|--------------|------------|---------------------|
| **Welcome email** | Confirms signup; sets expectations | LOW | Send on successful signup with link to app |
| **Invitation email** | Link to join tenant with assigned role | LOW | Include inviter name, tenant name, role, expiring link |
| **Password reset email** | Self-service password recovery | LOW | Supabase Auth handles; customize template |
| **Email verification** | Confirm email ownership | LOW | Supabase Auth handles; customize template |
| **Test reminder emails** | Remind Control Testers of upcoming/overdue tests | MEDIUM | Scheduled job (pg_cron or Vercel cron); template with test details |
| **Approval request email** | Notify Manager when change needs approval | MEDIUM | Triggered on change submission; include approve/reject links |
| **Approval result email** | Notify requester of approval/rejection | LOW | Triggered on approval decision; include reason if rejected |
| **Deadline reminder emails** | Notify of approaching remediation deadlines | MEDIUM | Scheduled job; configurable days-before threshold |

**Source:** [Mailtrap - 12 Transactional Emails Best Practices 2025](https://mailtrap.io/blog/transactional-emails-best-practices/), [Postmark - Transactional Email Best Practices 2025](https://postmarkapp.com/guides/transactional-email-best-practices)

### Email Deliverability Requirements

| Requirement | Why Required | Implementation |
|-------------|--------------|----------------|
| **SPF, DKIM, DMARC** | Required by Gmail/Yahoo since 2024; prevents spam flagging | Configure DNS records for Resend domain |
| **Separate domain/IP for transactional** | Marketing emails don't affect transactional deliverability | Use dedicated subdomain (e.g., `mail.riskguard.io`) |
| **No-reply avoidance** | `noreply@` addresses flagged as impersonal; may go to spam | Use `notifications@riskguard.io` with reply monitoring |
| **Plain text fallback** | Improves deliverability and accessibility | Include plain text version in all HTML emails |
| **Unsubscribe link** | Required for compliance; improves trust | Include in all reminder emails (not transactional like password reset) |

**Source:** [Postmark - Transactional Email Best Practices 2025](https://postmarkapp.com/guides/transactional-email-best-practices), [Mailmodo - Transactional Email Best Practices 2025](https://www.mailmodo.com/guides/transactional-email-best-practices/)

### Audit Trail & Compliance

| Feature | Why Expected | Complexity | Implementation Notes |
|---------|--------------|------------|---------------------|
| **Change logging** | Track who changed what, when; compliance requirement | MEDIUM | Already in v1.0; persist to database |
| **Login/session audit** | Track authentication events | LOW | Supabase Auth logs; extend with application logging |
| **Retention policy** | Keep audit logs for required period (e.g., 90 days minimum) | LOW | Configure Supabase retention or archive to cold storage |
| **Export for auditors** | Auditors need logs for compliance review | MEDIUM | Admin export function; filter by date range, user, action |

**Source:** [CloudEagle - SaaS Audit Checklist 2025](https://www.cloudeagle.ai/blogs/saas-audit-checklist), [Scrut - SaaS Compliance 2025](https://www.scrut.io/post/saas-compliance)

### Security Hardening

| Feature | Why Expected | Complexity | Implementation Notes |
|---------|--------------|------------|---------------------|
| **HTTPS everywhere** | Encryption in transit; non-negotiable | LOW | Vercel + Supabase both enforce HTTPS |
| **Encryption at rest** | Database encryption; Supabase provides | LOW | Supabase default; no action needed |
| **Rate limiting** | Prevent brute force and abuse | LOW | Supabase Auth has built-in; add API rate limits |
| **Input validation** | Prevent injection attacks | MEDIUM | Validate all inputs server-side; use parameterized queries |
| **CORS configuration** | Restrict API access to allowed origins | LOW | Configure Supabase allowed origins |
| **Session timeout** | Auto-logout after inactivity | LOW | Configure Supabase session duration |

**Source:** [Instinctools - SaaS Security Checklist 2025](https://www.instinctools.com/blog/saas-security-checklist/), [Jit - SaaS Security Best Practices 2025](https://www.jit.io/resources/app-security/7-saas-security-best-practices-for-2025)

---

## Differentiators (Competitive Advantage)

Features that improve UX and set RiskGuard apart, but are not strictly required for production launch.

| Feature | Value Proposition | Complexity | Implementation Notes |
|---------|-------------------|------------|---------------------|
| **Demo data seeders** | Sales team can instantly show product value without manual setup | MEDIUM | 5 presets: Empty, Casino, Bank, Insurer, Generic; database functions or Edge Functions |
| **Role-specific onboarding** | Invited users see features relevant to their role | MEDIUM | Different welcome flow based on role; reduce confusion |
| **Notification preferences** | Users control email frequency (instant, daily digest, off) | MEDIUM | User settings table; batch job for digest mode |
| **In-app notification center** | View notifications without leaving app; reduces email dependency | HIGH | Real-time via Supabase Realtime or polling; notification table |
| **Quiet hours** | Respect user work hours; don't email at 3am | LOW | Timezone + quiet hours in user preferences; schedule accordingly |
| **Bulk invite** | Director can invite multiple users at once | MEDIUM | CSV upload or multi-email form; batch invitation creation |
| **Tenant branding** | Customize logo, colors per organization | MEDIUM | Tenant settings table; apply theme dynamically |
| **Activity dashboard** | Director sees who's active, what's changing | MEDIUM | Aggregate audit log data; visualize activity |
| **Smart reminder scheduling** | Avoid notification fatigue; spread reminders intelligently | HIGH | Algorithm to avoid clustering; respect rate limits |

---

## Anti-Features (Deliberately NOT Building in v2.0)

Features that seem valuable but add complexity without proportional benefit for initial production launch.

| Anti-Feature | Why Requested | Why Avoid in v2.0 | Alternative |
|--------------|---------------|-------------------|-------------|
| **SSO (SAML/OIDC)** | Enterprise customers want single sign-on | Complex integration; requires per-customer config; email/password sufficient | Defer to v3; document as future roadmap item |
| **SCIM provisioning** | Auto-sync users from corporate directory | Complex; requires SSO first; manual invite flow works | Defer to v3; requires SSO foundation |
| **Real-time collaboration** | Multiple users editing simultaneously | Sync complexity, conflict resolution, cursor presence | Lock-on-edit pattern; "currently editing by X" message |
| **Push notifications** | Mobile alerts without app open | Requires service workers, notification permissions; email sufficient | Defer; email covers all use cases initially |
| **SMS notifications** | Alternative delivery channel | Cost per message; complexity; email is primary | Defer unless specific customer requirement |
| **Custom workflow engine** | Configurable approval chains per tenant | Over-engineering; four-eye pattern covers 90% of cases | Fixed workflow; configurable notification timing |
| **OAuth social login** | Sign in with Google/GitHub | B2B users expect email/password; social adds complexity | Defer; enterprise prefers corporate email |
| **Self-service tenant creation** | Users create their own organizations | Sales-driven business model; manual tenant setup preferred | Admin creates tenants; future self-service tier |
| **API access (external)** | Third-party integrations | Security surface area; authentication complexity; no customer request | Defer to v3; internal API only for now |
| **Mobile app** | Native iOS/Android experience | Development/maintenance cost; responsive web works on tablets | Web-first; responsive design covers mobile viewing |
| **Internationalization (i18n)** | Multi-language support | Translation maintenance; RTL complexity; English market first | Defer; architecture supports i18n later |
| **Webhook notifications** | Third-party system integration | Security and reliability complexity; no customer request | Defer; email sufficient for now |
| **Advanced MFA methods** | Hardware keys, biometric | Complexity; TOTP sufficient; no customer requirement | Support TOTP only; hardware keys in v3 |

---

## Feature Dependencies

```
[Tenant Model]
    |
    +---> [Row-Level Security Policies]
    |         |
    |         +---> [All data queries isolated]
    |
    +---> [Tenant Users Table]
              |
              +---> [Role Assignment]
                        |
                        +---> [Permission Checks]

[Supabase Auth]
    |
    +---> [Email/Password Login]
    |         |
    |         +---> [Session Management]
    |
    +---> [Email Verification]
    |
    +---> [Password Reset]
    |
    +---> [User Profile]

[Invitation System]
    |
    +---> [Director sends invite]
              |
              +---> [Invitation Email (Resend)]
                        |
                        +---> [User clicks link]
                                  |
                                  +---> [User sets password]
                                            |
                                            +---> [Role applied, added to tenant]

[Notification System]
    |
    +---> [Transactional Emails (triggered)]
    |         |
    |         +---> [Invitation, Welcome, Password Reset]
    |
    +---> [Scheduled Reminders (cron)]
              |
              +---> [Test reminders, Deadline alerts]
              |
              +---> [pg_cron or Vercel cron]

[Approval Workflow (from v1.0)]
    |
    +---> [Change submitted]
              |
              +---> [Approval request email to Manager]
                        |
                        +---> [Manager approves/rejects]
                                  |
                                  +---> [Result email to requester]
```

### Dependency Notes

- **RLS requires tenant_id on all tables:** Must migrate schema before enabling RLS
- **Invitations require Auth + Email:** User creation depends on Supabase Auth; invitation depends on Resend
- **Role-based UI requires Auth state:** Frontend must know user role to render appropriate UI
- **Scheduled jobs require cron setup:** Either pg_cron extension or Vercel cron routes
- **Audit trail requires all CRUD operations instrumented:** Every create/update/delete must log
- **Email deliverability requires DNS setup:** SPF/DKIM/DMARC before sending production email

---

## RiskGuard-Specific Email Templates Required

### Triggered (Immediate)

| Template | Trigger | Content |
|----------|---------|---------|
| **Invitation** | Director invites user | "You've been invited to join [Tenant] as [Role]. Click to set up your account." |
| **Welcome** | User completes signup | "Welcome to RiskGuard! Here's how to get started as a [Role]." |
| **Password Reset** | User requests reset | "Click to reset your password. Link expires in 1 hour." |
| **Email Verification** | User signs up | "Verify your email address to activate your account." |
| **Approval Requested** | Change submitted for approval | "[User] submitted [change type] for your approval. Review now." |
| **Change Approved** | Manager approves change | "Your [change type] has been approved by [Manager]." |
| **Change Rejected** | Manager rejects change | "Your [change type] was rejected. Reason: [reason]." |

### Scheduled (Cron)

| Template | Schedule | Content |
|----------|----------|---------|
| **Test Due Reminder** | Daily at 8am local | "You have [N] control tests due in the next 7 days." |
| **Test Overdue Alert** | Daily at 8am local | "You have [N] overdue control tests. Immediate action required." |
| **Remediation Deadline** | Daily at 8am local | "[N] remediation actions are due in the next 7 days." |
| **Weekly Digest** (optional) | Monday 8am | "This week in [Tenant]: [summary of activity]." |

---

## Control Testing Workflow Notifications

RiskGuard's control testing feature requires specific notification patterns:

| Event | Notify | Email Content |
|-------|--------|---------------|
| Control test assigned | Control Tester | "You've been assigned to test [Control Name]. Due: [Date]." |
| Test due in 7 days | Control Tester | "Reminder: [Control Name] test due in 7 days." |
| Test due in 1 day | Control Tester | "Urgent: [Control Name] test due tomorrow." |
| Test overdue | Control Tester + Director | "Overdue: [Control Name] test was due [Date]. Please complete immediately." |
| Test result submitted | Risk Manager | "[Control Tester] submitted test result for [Control Name]: [Pass/Fail]." |
| Test failed - needs remediation | Control Owner | "[Control Name] failed testing. Remediation required by [Date]." |
| Remediation completed | Risk Manager | "[Control Owner] marked remediation complete for [Control Name]." |

---

## MVP Definition for v2.0

### Must Have (Launch Blockers)

These features are required before v2.0 can go to production:

- [ ] **Multi-tenant database schema** with tenant_id on all tables
- [ ] **Row-level security policies** enforcing tenant isolation
- [ ] **Supabase Auth integration** with email/password
- [ ] **Email verification flow** before accessing app
- [ ] **Password reset flow** via Supabase Auth
- [ ] **User invitation system** (Director invites by email)
- [ ] **Role assignment on invite** (5 roles)
- [ ] **Permission enforcement** (frontend + RLS)
- [ ] **Transactional email via Resend** (invitation, welcome, password reset)
- [ ] **Test reminder emails** (scheduled, Control Tester)
- [ ] **Approval workflow emails** (request, approved, rejected)
- [ ] **Audit trail persistence** to database
- [ ] **Demo data seeders** (5 presets)
- [ ] **Vercel deployment** with environment configuration
- [ ] **SPF/DKIM/DMARC** for email deliverability

### Should Have (Add if Time Permits)

- [ ] **Notification preferences** (opt-out of reminders)
- [ ] **Bulk invite** (multiple users at once)
- [ ] **In-app notification center** (view notifications in app)
- [ ] **User deactivation** (soft-disable users)
- [ ] **MFA (TOTP)** optional per-user
- [ ] **Activity dashboard** for Directors

### Future (v3.0+)

- [ ] **SSO (SAML/OIDC)** for enterprise customers
- [ ] **SCIM provisioning** for user sync
- [ ] **Tenant branding** (custom logo, colors)
- [ ] **External API** for integrations
- [ ] **Push notifications** (mobile)
- [ ] **Advanced MFA** (hardware keys)

---

## Competitor Context: SaaS Backend Features

How do leading ERM platforms handle these features?

| Feature | Riskonnect | Archer | LogicGate | RiskGuard v2.0 Approach |
|---------|------------|--------|-----------|-------------------------|
| Multi-tenancy | Full isolation | Full isolation | Full isolation | RLS with tenant_id |
| Authentication | SSO + email/pwd | SSO required | SSO + email/pwd | Email/password (SSO v3) |
| User management | Full SCIM | Full SCIM | Self-service + admin | Director invite flow |
| Email notifications | Full suite | Full suite | Full suite | Essential transactional + reminders |
| Roles | Granular RBAC | Granular RBAC | Configurable roles | 5 fixed roles |
| Audit trail | Comprehensive | Comprehensive | Comprehensive | Full change history |
| Demo data | Sales-assisted | Sales-assisted | Sales-assisted | Self-service seeders (differentiator) |

**Our differentiation:**
1. **Demo data seeders** - Sales can demo without engineering support
2. **Simpler role model** - 5 roles instead of complex RBAC; faster to implement, easier to understand
3. **Modern stack** - Supabase/Vercel vs legacy enterprise platforms
4. **Fast time-to-value** - Invite flow vs complex procurement process

---

## Sources

### Multi-Tenancy & Row-Level Security
- [AWS Database Blog - Multi-tenant data isolation with PostgreSQL Row Level Security](https://aws.amazon.com/blogs/database/multi-tenant-data-isolation-with-postgresql-row-level-security/)
- [Nile Dev - Shipping multi-tenant SaaS using Postgres Row-Level Security](https://www.thenile.dev/blog/multi-tenant-rls)
- [Simplyblock - Row-Level Security for Multi-Tenant Applications](https://www.simplyblock.io/blog/underated-postgres-multi-tenancy-with-row-level-security/)
- [Microsoft Learn - Multitenant SaaS Patterns - Azure SQL Database](https://learn.microsoft.com/en-us/azure/azure-sql/database/saas-tenancy-app-design-patterns?view=azuresql)
- [Frontegg - SaaS Multitenancy Components, Pros and Cons](https://frontegg.com/blog/saas-multitenancy)

### Authentication & Authorization
- [Descope - SaaS Authentication: Key Considerations & Best Practices](https://www.descope.com/blog/post/saas-auth)
- [WorkOS - The complete guide to user management for B2B SaaS](https://workos.com/blog/user-management-for-b2b-saas)
- [Frontegg - Roles and Permissions Handling in SaaS Applications](https://frontegg.com/guides/roles-and-permissions-handling-in-saas-applications)
- [Cerbos - Implementing an Authorization Model for a SaaS Application](https://www.cerbos.dev/blog/implementing-an-authorization-model-for-a-saas-application)
- [EnterpriseReady - Role Based Access Control Guide](https://www.enterpriseready.io/features/role-based-access-control/)

### User Invitation & Onboarding
- [UserPilot - How to Onboard Invited Users to your SaaS Product](https://userpilot.com/blog/onboard-invited-users-saas/)
- [Auth0 - User Onboarding Strategies in B2B SaaS](https://auth0.com/blog/user-onboarding-strategies-b2b-saas/)
- [PageFlows - Designing an intuitive user flow for inviting teammates](https://pageflows.com/resources/invite-teammates-user-flow/)
- [Appcues - How to onboard invited users and fast-track engagement](https://www.appcues.com/blog/user-onboarding-strategies-invited-users)

### Email Notifications
- [Mailtrap - 12 Transactional Emails Best Practices 2025](https://mailtrap.io/blog/transactional-emails-best-practices/)
- [Postmark - Transactional Email Best Practices 2025](https://postmarkapp.com/guides/transactional-email-best-practices)
- [Mailmodo - Transactional Email Best Practices 2025](https://www.mailmodo.com/guides/transactional-email-best-practices/)
- [UserPilot - 10 Must-Have Transactional Email Templates for SaaS 2025](https://userpilot.com/blog/transactional-email-templates/)
- [MagicBell - Notification System Design: Architecture & Best Practices](https://www.magicbell.com/blog/notification-system-design)

### Approval Workflows
- [Spendflo - Approval Workflow Process for Effective Decisions](https://www.spendflo.com/blog/approval-workflows)
- [Oracle - Define When to Send Workflow Notifications](https://docs.oracle.com/en/cloud/saas/financials/24c/fafcf/define-when-to-send-workflow-notifications.html)
- [Vanta - Risk assessment and management software](https://www.vanta.com/products/risk)

### Security & Compliance
- [Valence Security - SaaS Security Best Practices 2025](https://www.valencesecurity.com/resources/blogs/saas-security-best-practices-and-strategies-for-2025)
- [CloudEagle - SaaS Audit Checklist 2025](https://www.cloudeagle.ai/blogs/saas-audit-checklist)
- [Scrut - SaaS Compliance 2025](https://www.scrut.io/post/saas-compliance)
- [Instinctools - SaaS Security Checklist 2025](https://www.instinctools.com/blog/saas-security-checklist/)
- [Jit - SaaS Security Best Practices 2025](https://www.jit.io/resources/app-security/7-saas-security-best-practices-for-2025)

### ERM Platform Features
- [Riskonnect - 10 Best ERM Software Platforms 2025](https://riskonnect.com/the-10-best-enterprise-risk-management-erm-software-platforms-in-2025/)
- [TechTarget - 16 Top ERM Software Vendors 2025](https://www.techtarget.com/searchcio/feature/Top-ERM-software-vendors-to-consider)
- [360Factors - Risk Control Self Assessment Software](https://www.360factors.com/risk-control-self-assessments/)
- [Workiva - Internal Controls Software](https://www.workiva.com/solutions/internal-controls-management)

---

*Feature research for: RiskGuard ERM v2.0 - Production Multi-Tenant SaaS Backend*
*Researched: 2026-01-24*
*Confidence: HIGH*
