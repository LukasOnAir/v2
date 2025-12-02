# Requirements: RiskGuard ERM v2.0

**Defined:** 2026-01-24
**Core Value:** Enable organizations to see which business processes face unacceptable risks and ensure controls are in place where needed.

## v2.0 Requirements

Requirements for production backend milestone. Each maps to roadmap phases.

### Database & Multi-Tenancy

- [ ] **DB-01**: Add tenant_id column to all tables
- [ ] **DB-02**: Implement Row-Level Security policies on all tables
- [ ] **DB-03**: Create composite indexes (tenant_id + frequently queried columns)
- [ ] **DB-04**: Create restricted app_user role without BYPASSRLS

### Authentication

- [ ] **AUTH-01**: Implement email/password login via Supabase Auth
- [ ] **AUTH-02**: Require email verification before app access
- [ ] **AUTH-03**: Implement password reset flow via Supabase Auth
- [ ] **AUTH-04**: Configure secure session management with timeout

### Authorization (Roles)

- [ ] **ROLE-01**: Implement Director role (create users, assign roles, manage organization)
- [ ] **ROLE-02**: Implement Manager role (approve changes in four-eye workflow)
- [ ] **ROLE-03**: Implement Risk Manager role (full ERM access)
- [ ] **ROLE-04**: Implement Control Owner role (view-only, request changes)
- [ ] **ROLE-05**: Implement Control Tester role (test assigned controls only)
- [ ] **ROLE-06**: Enforce permissions via RLS policies (database-level)
- [ ] **ROLE-07**: Implement role-based UI rendering (hide unauthorized actions)

### User Management

- [ ] **USER-01**: Director can invite users by email
- [ ] **USER-02**: Role assignment on invite (Director specifies role)
- [ ] **USER-03**: Invitation links expire after 7 days
- [ ] **USER-04**: Director can deactivate users (soft-disable without deletion)
- [ ] **USER-05**: Users can update own profile (name, password)

### Email Notifications - Triggered

- [ ] **EMAIL-01**: Send invitation email with join link and role information
- [ ] **EMAIL-02**: Send welcome email after user completes signup
- [ ] **EMAIL-03**: Send password reset email via Supabase Auth
- [ ] **EMAIL-04**: Send email verification email via Supabase Auth
- [ ] **EMAIL-05**: Send approval request notification to Manager when change submitted
- [ ] **EMAIL-06**: Send approval result notification (approved/rejected with reason)
- [ ] **EMAIL-07**: Send notification when control test is assigned to tester

### Email Notifications - Scheduled

- [ ] **SCHED-01**: Send test due reminder 7 days before deadline
- [ ] **SCHED-02**: Send test overdue alert when deadline passed
- [ ] **SCHED-03**: Send remediation deadline reminder 7 days before due
- [ ] **SCHED-04**: Implement scheduling via pg_cron (primary) + Vercel cron (backup)

### Security & Audit

- [ ] **SEC-01**: Persist audit trail to Supabase database
- [ ] **SEC-02**: Log authentication events (login, logout, failed attempts)
- [ ] **SEC-03**: Implement rate limiting on auth endpoints
- [ ] **SEC-04**: Validate all inputs server-side before database operations
- [ ] **SEC-05**: Configure CORS to restrict API access to allowed origins
- [ ] **SEC-06**: Configure SPF, DKIM, DMARC DNS records for email deliverability

### Demo Data Seeders

- [ ] **DEMO-01**: Create Empty preset (blank tenant)
- [ ] **DEMO-02**: Create Casino preset (Holland Casino themed data)
- [ ] **DEMO-03**: Create Bank preset (banking/financial themed data)
- [ ] **DEMO-04**: Create Insurer preset (insurance themed data)
- [ ] **DEMO-05**: Create Generic preset (general ERM sample data)

### Deployment

- [ ] **DEPLOY-01**: Configure Vercel deployment with build settings
- [ ] **DEPLOY-02**: Manage environment variables securely (Supabase keys, Resend API key)

### Production Hardening

- [x] **PROD-01**: Implement error boundaries and centralized error handling
- [x] **PROD-02**: Implement application logging with structured output
- [x] **PROD-03**: Set up monitoring dashboard (Vercel Analytics or similar)
- [x] **PROD-04**: Configure alerting for uptime and error rate thresholds

### Mobile Responsiveness

- [ ] **MOBILE-01**: Make Control Tester interface mobile-responsive for field use

## v3.0 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Enterprise Authentication

- **AUTH-05**: SSO via SAML/OIDC for enterprise identity providers
- **AUTH-06**: SCIM provisioning for automated user sync
- **AUTH-07**: MFA with TOTP (optional per-user)

### Advanced Features

- **NOTIF-01**: In-app notification center
- **NOTIF-02**: Notification preferences (opt-out, digest mode)
- **USER-06**: Bulk invite (multiple users at once)
- **BRAND-01**: Tenant branding (custom logo, colors)
- **API-01**: External API for third-party integrations

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile app (native) | Web-first; responsive design covers mobile use cases |
| Real-time collaboration | Sync complexity; lock-on-edit pattern sufficient |
| Push notifications | Email sufficient; adds complexity |
| SMS notifications | Cost per message; email is primary channel |
| Custom workflow engine | Over-engineering; four-eye pattern covers 90% of cases |
| OAuth social login | B2B users expect email/password; enterprise prefers corporate email |
| Self-service tenant creation | Sales-driven model; manual tenant setup preferred |
| Internationalization (i18n) | English market first; defer to v3+ |
| Import from Excel | Demo seeders cover onboarding needs |
| AI risk suggestions | Emerging tech; defer to v3+ |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DB-01 | Phase 21 | Complete |
| DB-02 | Phase 21 | Complete |
| DB-03 | Phase 21 | Complete |
| DB-04 | Phase 21 | Complete |
| AUTH-01 | Phase 21 | Complete |
| AUTH-02 | Phase 21 | Complete |
| AUTH-03 | Phase 21 | Complete |
| AUTH-04 | Phase 21 | Complete |
| ROLE-01 | Phase 22 | Complete |
| ROLE-02 | Phase 22 | Complete |
| ROLE-03 | Phase 22 | Complete |
| ROLE-04 | Phase 22 | Complete |
| ROLE-05 | Phase 22 | Complete |
| ROLE-06 | Phase 22 | Complete |
| ROLE-07 | Phase 22 | Complete |
| USER-01 | Phase 22 | Complete |
| USER-02 | Phase 22 | Complete |
| USER-03 | Phase 22 | Complete |
| USER-04 | Phase 22 | Complete |
| USER-05 | Phase 22 | Complete |
| EMAIL-01 | Phase 23 | Complete |
| EMAIL-02 | Phase 23 | Complete |
| EMAIL-03 | Phase 23 | Complete |
| EMAIL-04 | Phase 23 | Complete |
| EMAIL-05 | Phase 23 | Complete |
| EMAIL-06 | Phase 23 | Complete |
| EMAIL-07 | Phase 23 | Complete |
| SCHED-01 | Phase 23 | Complete |
| SCHED-02 | Phase 23 | Complete |
| SCHED-03 | Phase 23 | Complete |
| SCHED-04 | Phase 23 | Complete |
| SEC-01 | Phase 21 | Complete |
| SEC-02 | Phase 21 | Complete |
| SEC-03 | Phase 21 | Complete |
| SEC-04 | Phase 24 | Pending |
| SEC-05 | Phase 21 | Complete |
| SEC-06 | Phase 23 | Complete |
| DEMO-01 | Phase 24 | Pending |
| DEMO-02 | Phase 24 | Pending |
| DEMO-03 | Phase 24 | Pending |
| DEMO-04 | Phase 24 | Pending |
| DEMO-05 | Phase 24 | Pending |
| DEPLOY-01 | Phase 24 | Pending |
| DEPLOY-02 | Phase 24 | Pending |
| PROD-01 | Phase 25 | Complete |
| PROD-02 | Phase 25 | Complete |
| PROD-03 | Phase 25 | Complete |
| PROD-04 | Phase 25 | Complete |
| MOBILE-01 | Phase 24 | Pending |

**Coverage:**
- v2.0 requirements: 49 total
- Mapped to phases: 49
- Unmapped: 0

**Phase Distribution:**
| Phase | Requirements | Count |
|-------|--------------|-------|
| Phase 21 | DB-01 to DB-04, AUTH-01 to AUTH-04, SEC-01, SEC-02, SEC-03, SEC-05 | 12 |
| Phase 22 | ROLE-01 to ROLE-07, USER-01 to USER-05 | 12 |
| Phase 23 | EMAIL-01 to EMAIL-07, SCHED-01 to SCHED-04, SEC-06 | 12 |
| Phase 24 | DEMO-01 to DEMO-05, DEPLOY-01, DEPLOY-02, SEC-04, MOBILE-01 | 9 |
| Phase 25 | PROD-01 to PROD-04 | 4 |

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-24 after roadmap creation*
