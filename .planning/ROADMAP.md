# Roadmap: RiskGuard ERM v2.0

## Overview

Transform v1.0 (LocalStorage demo) into a production multi-tenant SaaS platform with Supabase backend, authentication, role-based access, and automated email notifications. The journey moves from database foundation through user management, email workflows, demo data for sales, and production hardening. Target: Holland Casino deployment with enterprise security standards.

## Milestones

- v1.0 MVP (Phases 1-20) - SHIPPED 2026-01-24
- v2.0 Production Backend (Phases 21-25) - IN PROGRESS

## Phases

<details>
<summary>v1.0 MVP (Phases 1-20) - SHIPPED 2026-01-24</summary>

See archived phase directories for details.

</details>

### v2.0 Production Backend (In Progress)

**Milestone Goal:** Production-ready multi-tenant SaaS with real authentication, role-based access, and automated notifications.

- [x] **Phase 21: Database & Auth Foundation** - Supabase infrastructure, RLS, authentication flows
- [x] **Phase 22: Authorization & User Management** - Five roles, permissions, invite flow
- [x] **Phase 23: Email & Scheduling** - Transactional emails, scheduled reminders
- [x] **Phase 24: Demo Seeders & Deployment** - Sales demo presets, Vercel deployment
- [x] **Phase 25: Production Hardening** - Error handling, logging, monitoring, alerting
- [x] **Phase 26: Shared Tenant Database** - Persist application data to Supabase so all tenant users share the same data
- [x] **Phase 27: Sunburst Enhancements** - Dynamic sizing, animations, legend integration, and UX polish
- [x] **Phase 28: Matrix Invertible Display** - Row/column swap and configurable label display modes
- [x] **Phase 29: Demo Tenant Seed Data** - Populate demo tenant with generic risk management data
- [x] **Phase 30: Matrix Resizable Headers** - Drag to resize row/column headers for readability
- [x] **Phase 31: Controls Hub UI Fix** - Fix controls and remediation plans not displaying in authenticated mode
- [x] **Phase 32: RCT L4/L5 Taxonomy Display** - Fix L4 and L5 taxonomy levels not showing in RCT columns
- [x] **Phase 33: RCT Column Auto-Sizing** - Auto-fit column widths matching Risk Process Matrix behavior
- [x] **Phase 34: Tickets Dashboard Enhancements** - Collapsible statistics and multi-select linking
- [x] **Phase 35: Controls Hub Enhancements** - Remove risk names column, add clickable control icons
- [x] **Phase 36: Mobile Control Tester** - Dedicated mobile app experience for first-line control testers with guided workflows
- [x] **Phase 37: RCT Search and Sort** - Searchable RCT with column sorting (A-Z/Z-A)
- [x] **Phase 38: Control Assignment & Hub Parity** - Assignment UI in RCT side panel, Controls Hub data parity, assignee column, fix tester dropdown
- [x] **Phase 39: Create Request for Information Document** - Generate RFI document for procurement/vendor assessment workflows
- [ ] **Phase 40: Admin Feature Visibility** - Developer super-admin app to toggle feature visibility across all tenants
- [x] **Phase 41: Control Tester Visibility Fix** - Fix controls not visible for control testers while controls are assigned
- [ ] **Phase 42: Verify Invitation Flow** - Test end-to-end invitation flow sets app_metadata correctly
- [x] **Phase 43: Signup Button Visibility** - Super-admin toggle for signup button visibility on login page
- [x] **Phase 44: Super-Admin Tenant Switching** - Super-admin can view as any tenant/profile
- [ ] **Phase 45: Control Test Steps** - Define step-by-step test procedures for controls with guided execution in wizard

## Phase Details

### Phase 21: Database & Auth Foundation
**Goal:** Users can securely log in and all data is isolated by tenant at the database level
**Depends on:** Nothing (first v2.0 phase)
**Requirements:** DB-01, DB-02, DB-03, DB-04, AUTH-01, AUTH-02, AUTH-03, AUTH-04, SEC-01, SEC-02, SEC-03, SEC-05
**Success Criteria** (what must be TRUE):
  1. User can create account with email and password
  2. User can log in and stay authenticated across browser sessions
  3. User can reset forgotten password via email
  4. User must verify email before accessing the application
  5. All database queries return only data belonging to user's tenant (RLS enforced)
**Plans:** 7 plans

Plans:
- [x] 21-01-PLAN.md - Supabase client setup and dependencies
- [x] 21-02-PLAN.md - Database schema with RLS migrations
- [x] 21-03-PLAN.md - Auth context and protected routes
- [x] 21-04-PLAN.md - Login, signup, password reset pages
- [x] 21-05-PLAN.md - Email verification pages and route config
- [x] 21-06-PLAN.md - Auth event logging and security config
- [x] 21-07-PLAN.md - CORS config, types, and integration verification

### Phase 22: Authorization & User Management
**Goal:** Directors can manage their organization's users with appropriate role-based access
**Depends on:** Phase 21
**Requirements:** ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06, ROLE-07, USER-01, USER-02, USER-03, USER-04, USER-05
**Success Criteria** (what must be TRUE):
  1. Director can invite new users by email and assign their role
  2. Invited user receives email with join link that expires after 7 days
  3. Each role sees only the UI elements and actions they are permitted (Control Tester sees only assigned tests)
  4. Director can deactivate a user without deleting their data
  5. User can update their own profile (name, password)
**Plans:** 5 plans

Plans:
- [x] 22-01-PLAN.md - Database schema: pending_invitations, is_user_active(), Director policies
- [x] 22-02-PLAN.md - Permission system: constants, usePermissions hook with AuthContext
- [x] 22-03-PLAN.md - Edge Functions: send-invitation, accept-invitation
- [x] 22-04-PLAN.md - User Management UI: Director invite/list/deactivate interface
- [x] 22-05-PLAN.md - Profile & Invitation pages: accept-invite, profile update

### Phase 23: Email & Scheduling
**Goal:** Users receive automated notifications for tests, approvals, and deadlines
**Depends on:** Phase 22
**Requirements:** EMAIL-01, EMAIL-02, EMAIL-03, EMAIL-04, EMAIL-05, EMAIL-06, EMAIL-07, SCHED-01, SCHED-02, SCHED-03, SCHED-04, SEC-06
**Success Criteria** (what must be TRUE):
  1. New user receives invitation email with join link and role information
  2. Control Tester receives email when assigned to a test
  3. Manager receives email when change requires approval; submitter receives approval/rejection email
  4. Control Tester receives reminder 7 days before test deadline and alert when overdue
  5. Emails are delivered reliably (SPF/DKIM/DMARC configured)
**Plans:** 5 plans

Plans:
- [x] 23-01-PLAN.md - Send Email Hook for Supabase Auth emails (password reset, verification)
- [x] 23-02-PLAN.md - Triggered notifications Edge Function (approval, assignment)
- [x] 23-03-PLAN.md - Scheduling infrastructure (pg_cron, process-reminders)
- [x] 23-04-PLAN.md - Email preferences and domain verification
- [x] 23-05-PLAN.md - Frontend notification integration

### Phase 24: Demo Seeders & Deployment
**Goal:** Sales can run demos with realistic pre-populated data on production infrastructure
**Depends on:** Phase 23
**Requirements:** DEMO-01, DEMO-02, DEMO-03, DEMO-04, DEMO-05, DEPLOY-01, DEPLOY-02, SEC-04, MOBILE-01
**Success Criteria** (what must be TRUE):
  1. Director can select from 5 demo presets when initializing tenant (Empty, Casino, Bank, Insurer, Generic)
  2. Demo data includes realistic risk taxonomies, process taxonomies, controls, and test schedules
  3. Application is deployed to Vercel with proper environment variable management
  4. Control Tester interface works on mobile devices in the field
**Plans:** 5 plans

Plans:
- [x] 24-01-PLAN.md - Demo preset data modules (5 industry presets)
- [x] 24-02-PLAN.md - Mobile responsive Control Tester interface
- [x] 24-03-PLAN.md - Server-side Zod validation for Edge Functions
- [x] 24-04-PLAN.md - Seed demo data Edge Function and UI
- [x] 24-05-PLAN.md - Vercel deployment and verification

### Phase 25: Production Hardening
**Goal:** Application is production-ready with proper error handling, observability, and alerting
**Depends on:** Phase 24
**Requirements:** PROD-01, PROD-02, PROD-03, PROD-04
**Success Criteria** (what must be TRUE):
  1. Application errors are caught by error boundaries and logged with structured output
  2. Monitoring dashboard shows application health, response times, and error rates
  3. Team receives alerts when error rate exceeds threshold or application is down
  4. Users see friendly error messages instead of stack traces
**Plans:** 3 plans

Plans:
- [x] 25-01-PLAN.md - Error boundaries and user-friendly error handling
- [x] 25-02-PLAN.md - Structured logging for frontend and Edge Functions
- [x] 25-03-PLAN.md - Vercel Analytics, Speed Insights, and UptimeRobot alerting

### Phase 26: Shared Tenant Database
**Goal:** All users within a tenant see and work with the same data persisted in Supabase
**Depends on:** Phase 25
**Requirements:** DATA-01 (taxonomy persistence), DATA-02 (controls persistence), DATA-03 (RCT persistence), DATA-04 (realtime sync), DATA-05 (demo mode preservation)
**Success Criteria** (what must be TRUE):
  1. Risk taxonomies, process taxonomies, and RCT entries are persisted to Supabase database
  2. All users within the same tenant see identical data
  3. Changes made by one user are visible to other tenant users
  4. RLS policies ensure data isolation between tenants
  5. Migration from LocalStorage to Supabase preserves existing functionality
**Plans:** 9 plans

Plans:
- [x] 26-01-PLAN.md - Core database schema migrations (taxonomy_nodes, controls, rct_rows)
- [x] 26-02-PLAN.md - Secondary schema migrations (tests, remediation, tickets, comments, approvals)
- [x] 26-03-PLAN.md - React Query setup and taxonomy hooks
- [x] 26-04-PLAN.md - Controls and RCT hooks
- [x] 26-05-PLAN.md - Remaining entity hooks (tests, tickets, comments, approvals)
- [x] 26-06-PLAN.md - Realtime subscription setup
- [x] 26-07-PLAN.md - Zustand store updates for dual-mode operation
- [x] 26-08-PLAN.md - Core page integration (taxonomy, RCT)
- [x] 26-09-PLAN.md - Complete integration and verification

### Phase 26.1: Database Integration Gaps (INSERTED)
**Goal:** Fix remaining components not fully wired to database layer
**Depends on:** Phase 26
**Requirements:** DATA-01 through DATA-05 (gap closure)
**Success Criteria** (what must be TRUE):
  1. Regenerate RCT button updates existing rows when taxonomy changes
  2. Control counts in RCT reflect database-linked controls correctly
  3. No stale localStorage/demo data shown when authenticated
  4. Custom columns (text, number, dropdown) save and display correctly
  5. Risk Process Matrix displays data from database
  6. Sunburst visualization displays data from database
**Plans:** 5 plans

Plans:
- [x] 26.1-01-PLAN.md - Regenerate RCT upsert (preserve existing data on taxonomy change)
- [x] 26.1-02-PLAN.md - ControlPanel dual-source wiring (database when authenticated)
- [x] 26.1-03-PLAN.md - Custom columns dual-source in RCTTable
- [x] 26.1-04-PLAN.md - MatrixGrid dual-source wiring
- [x] 26.1-05-PLAN.md - useSunburstData dual-source wiring

### Phase 26.2: Additional Data Sync (INSERTED)
**Goal:** Sync remaining features to database: approval queue, audit trail, analytics, knowledge base
**Depends on:** Phase 26.1
**Requirements:** DATA-01 through DATA-05 (gap closure)
**Success Criteria** (what must be TRUE):
  1. Approval queue reads/writes to database when authenticated
  2. Audit trail reads from database (already written by triggers)
  3. Analytics dashboard derives data from database tables
  4. Knowledge base persists to database when authenticated
**Plans:** 4 plans

Plans:
- [x] 26.2-01-PLAN.md - ApprovalQueue dual-source wiring (existing hooks)
- [x] 26.2-02-PLAN.md - Audit trail database hook and AuditPage dual-source
- [x] 26.2-03-PLAN.md - Analytics database hooks and component dual-source
- [x] 26.2-04-PLAN.md - Knowledge base table, hooks, and page dual-source

### Phase 27: Sunburst Enhancements
**Goal:** Polish the sunburst visualization with dynamic sizing, animations, and improved UX
**Depends on:** Phase 26.1
**Requirements:** UX-01 (visualization polish)
**Success Criteria** (what must be TRUE):
  1. Sunburst resizes dynamically when fewer levels are selected (no empty space for L4-L5 when only L1-L3 shown)
  2. Empty nodes on L1 level close gaps instead of leaving wedge holes
  3. Opening animation: sunburst unfolds/expands on page load
  4. Center text shows "AVG" or "MAX" based on aggregation setting (not "Enterprise Risk")
  5. Legend positioned inside sunburst box (top-right), not in separate container
  6. Score bar and text reveal with downward animation after sunburst opens
**Plans:** 5 plans

Plans:
- [x] 27-01-PLAN.md - Dynamic layout: level-based sizing and L1 gap closure
- [x] 27-02-PLAN.md - Opening animation and center reveal sequence
- [x] 27-03-PLAN.md - Center text AVG/MAX and legend repositioning
- [x] 27-04-PLAN.md - Responsive container sizing and dynamic label truncation (gap closure)
- [x] 27-05-PLAN.md - Fan-style animation and legend bar reveal (gap closure)

### Phase 28: Matrix Invertible Display
**Goal:** Risk-Process Matrix supports row/column inversion and configurable label display modes
**Depends on:** Phase 27
**Requirements:** UX-02 (matrix flexibility)
**Success Criteria** (what must be TRUE):
  1. User can swap rows and columns (risks ↔ processes) with a toggle control
  2. User can configure risk label display: ID only, Name only, or ID + Name
  3. User can configure process label display: ID only, Name only, or ID + Name
  4. Label display settings persist when matrix orientation is inverted
  5. Settings persist across sessions (localStorage for demo, database for authenticated)
**Plans:** 3 plans

Plans:
- [x] 28-01-PLAN.md - Add display settings to matrixStore (isInverted, labelModes)
- [x] 28-02-PLAN.md - MatrixToolbar controls for inversion and label modes
- [x] 28-03-PLAN.md - MatrixGrid inversion logic and label formatting

### Phase 29: Demo Tenant Seed Data
**Goal:** Populate demo tenant (5ea03edb-6e79-4b62-bd36-39f1963d0640) with generic risk management data for all features
**Depends on:** Phase 28
**Requirements:** DEMO-01 (realistic demo data)
**Success Criteria** (what must be TRUE):
  1. Risk taxonomy populated with generic enterprise risk categories (L1-L5)
  2. Process taxonomy populated with generic business process categories (L1-L5)
  3. Controls linked to appropriate risk-process combinations
  4. Remediation plans created for sample controls
  5. RCT matrix fully populated with risk assessments
  6. All data is generic (not industry-specific) and showcases all features
**Plans:** 3 plans

Plans:
- [x] 29-01-PLAN.md - Risk taxonomy seed SQL script (L1-L5 hierarchy)
- [x] 29-02-PLAN.md - Process taxonomy seed SQL script (L1-L5 hierarchy)
- [x] 29-03-PLAN.md - RCT rows, controls, control links, tests, and remediation plans

### Phase 30: Matrix Resizable Headers
**Goal:** Matrix row and column headers can be resized for better readability when text doesn't fit
**Depends on:** Phase 28
**Requirements:** UX-03 (matrix usability)
**Success Criteria** (what must be TRUE):
  1. User can drag column header edges to resize width
  2. User can drag row header edges to resize height
  3. Resize handles appear on hover for intuitive discovery
  4. Header sizes persist across sessions (localStorage for demo, database for authenticated)
  5. Double-click header edge auto-fits to content width/height
**Plans:** 2 plans

Plans:
- [x] 30-01-PLAN.md - Add columnWidths/rowHeights state to matrixStore with persistence
- [x] 30-02-PLAN.md - ResizeHandle component and MatrixGrid integration

### Phase 31: Controls Hub UI Fix
**Goal:** Fix controls and remediation plans not displaying in UI when authenticated (data exists in database but not shown)
**Depends on:** Phase 30
**Requirements:** BUG-01 (Controls Hub display fix)
**Success Criteria** (what must be TRUE):
  1. Controls linked to RCT rows display in the Control Panel side panel
  2. Remediation plans display in the Controls Hub remediation section
  3. Control tests display with their results (pass/partial/fail)
  4. Data fetched correctly via RLS for authenticated users
**Plans:** 2 plans

Plans:
- [x] 31-01-PLAN.md - Wire remediation components to database (dual-source pattern)
- [x] 31-02-PLAN.md - Wire control test components to database (dual-source pattern)

### Phase 32: RCT L4/L5 Taxonomy Display
**Goal:** Fix L4 and L5 risk/process taxonomy levels not displaying values in RCT columns
**Depends on:** Phase 31
**Requirements:** BUG-02 (RCT L4/L5 display fix)
**Success Criteria** (what must be TRUE):
  1. L4 taxonomy nodes display in the correct L4 column of the RCT
  2. L5 taxonomy nodes display in the correct L5 column of the RCT
  3. RCT rows with L4/L5 risks show the complete hierarchy path
  4. RCT rows with L4/L5 processes show the complete hierarchy path
  5. Demo tenant data with L4/L5 nodes displays correctly
**Plans:** 1 plan

Plans:
- [x] 32-01-PLAN.md - Add L5 leaf RCT rows to seed data and verify hierarchy traversal

### Phase 33: RCT Column Auto-Sizing
**Goal:** RCT columns can be auto-sized to fit content, matching the Risk Process Matrix behavior
**Depends on:** Phase 32
**Requirements:** UX-04 (RCT usability)
**Success Criteria** (what must be TRUE):
  1. Double-click column header edge auto-fits to content width
  2. Auto-sizing calculates width based on longest cell content in column
  3. Header text and cell content both considered for width calculation
  4. Column widths persist across sessions (localStorage for demo, database for authenticated)
  5. Behavior matches Risk Process Matrix auto-sizing for consistency
**Plans:** 1 plan

Plans:
- [x] 33-01-PLAN.md - Add columnWidths state to rctStore and integrate ResizeHandle in RCTTable

### Phase 34: Tickets Dashboard Enhancements
**Goal:** Improve Tickets Dashboard UX with collapsible statistics and multi-select linking
**Depends on:** Phase 33
**Requirements:** UX-05 (Tickets usability)
**Success Criteria** (what must be TRUE):
  1. User can toggle visibility of status, priority, and category summary statistics rows
  2. Status statistics row visible by default; priority and category rows hidden by default
  3. Active and overdue tickets always displayed prominently at the top
  4. User can select multiple items (risks/controls/processes/RCT rows) via checkboxes when linking
  5. Bulk link action links all selected items to ticket in one operation
**Plans:** 2 plans

Plans:
- [x] 34-01-PLAN.md - Add collapsible sections to TicketsSummary with uiStore persistence
- [x] 34-02-PLAN.md - Multi-select checkbox list for entity linking in TicketForm

### Phase 35: Controls Hub Enhancements
**Goal:** Improve Controls Hub UX by removing risk names column and adding clickable control icons
**Depends on:** Phase 34
**Requirements:** UX-06 (Controls Hub usability)
**Success Criteria** (what must be TRUE):
  1. Risk names column is removed from Controls Hub table
  2. Linked risks count column is removed (count shown in icon instead)
  3. Clickable icon (Settings2 + count) appears to the left of each control name
  4. Both the icon and the control name text are clickable (open same detail view)
  5. Icon styling matches the existing RCT clickable icon pattern
**Plans:** 1 plan

Plans:
- [x] 35-01-PLAN.md - Controls Hub icon and column cleanup

### Phase 36: Mobile Control Tester
**Goal:** First-line employees can complete control tests on mobile with minimal friction, guided step-by-step workflows, and automated reminders
**Depends on:** Phase 35
**Requirements:** MOBILE-02 (enhanced mobile experience for testers)
**Success Criteria** (what must be TRUE):
  1. Control testers can view and complete assigned tests on mobile phones
  2. Tests broken into small, actionable steps with clear instructions
  3. Weekly reminder notifications sent to testers with pending tests
  4. Progress tracking shows completed steps and overall test status
  5. Photo/document upload capability for test evidence
  6. Offline-capable: testers can work without constant connectivity
  7. Simple, jargon-free interface suitable for non-risk-management staff
**Plans:** 5 plans

Plans:
- [x] 36-01-PLAN.md - PWA infrastructure (vite-plugin-pwa, manifest, icons, ReloadPrompt)
- [x] 36-02-PLAN.md - Offline queue (IndexedDB, network status, pending sync)
- [x] 36-03-PLAN.md - Test wizard UX (step-by-step form, photo upload, storage bucket)
- [x] 36-04-PLAN.md - Reminders activation (update Edge Function with real queries)
- [x] 36-05-PLAN.md - Mobile polish and verification checkpoint (UAT fixes applied)

### Phase 37: RCT Search and Sort
**Goal:** Users can quickly find specific RCT rows via search and sort columns for efficient data navigation
**Depends on:** Phase 36
**Requirements:** UX-07 (RCT usability)
**Success Criteria** (what must be TRUE):
  1. User can search RCT by typing in a search box (filters visible rows)
  2. Search matches across all text columns (risk names, process names, custom text fields)
  3. User can click any column header to sort A-Z
  4. Clicking the same column header again reverses sort to Z-A
  5. Visual indicator shows current sort column and direction
  6. Search and sort can be combined (sort filtered results)
**Plans:** 1 plan

Plans:
- [x] 37-01-PLAN.md - Add search input to toolbar and column sorting with visual indicators

### Phase 38: Control Assignment & Hub Parity
**Goal:** Unified control assignment experience across RCT and Controls Hub with full data parity
**Depends on:** Phase 37
**Requirements:** ROLE-03, ROLE-04, ROLE-05, UX-08
**Success Criteria** (what must be TRUE):
  1. RCT controls side panel has same "Assign to" dropdown as Controls Hub
  2. Controls Hub shows all data fields visible in RCT side panel (remediation plans, tests, linked risks, etc.)
  3. Controls Hub table has "Assigned To" column showing assignee name
  4. Control Tester users appear in assignment dropdown (fix: currently not showing)
  5. Control Testers see only controls/tests assigned to them
  6. Control Owners see only controls assigned to them
  7. Assignment changes sync between RCT panel and Controls Hub (same underlying data)
**Plans:** 3 plans

Plans:
- [x] 38-01-PLAN.md - Add assignment dropdown to RCT ControlPanel and Assigned To column to ControlsTable
- [x] 38-02-PLAN.md - Add missing sections to ControlDetailPanel and seed control-tester profiles
- [x] 38-03-PLAN.md - Role-based control filtering for Tester/Owner roles

### Phase 39: Create Request for Information Document
**Goal:** Users can generate RFI documents for procurement and vendor assessment workflows
**Depends on:** Phase 38
**Requirements:** DOC-01 (RFI generation)
**Success Criteria** (what must be TRUE):
  1. User can click "Show RFI" button in header (next to RiskLytix logo)
  2. PDF preview displays in modal dialog
  3. User can download RFI as PDF file
  4. PDF contains static risk management methodology content (6 sections)
  5. PDF library lazy-loaded to minimize bundle impact
**Plans:** 1 plan

Plans:
- [x] 39-01-PLAN.md - Install react-pdf, create RFI document/dialog, integrate in Header

### Phase 40: Admin Feature Visibility
**Goal:** Developer super-admin can toggle feature visibility across all tenants from a separate admin app
**Depends on:** Phase 39
**Requirements:** ADMIN-01 (super-admin feature visibility control)
**Success Criteria** (what must be TRUE):
  1. Separate /admin app accessible only to developer/super-admin accounts
  2. Super-admin can toggle global feature visibility (affects ALL tenants)
  3. RFI button visibility respects global feature flag across all tenants
  4. Demo mode shows all features by default (no restrictions for sales demos)
  5. Infrastructure supports adding more feature toggles in the future
  6. Regular tenant users cannot access admin app
**Plans:** 5 plans (3 legacy + 2 new)

Plans:
- [x] 40-01-PLAN.md - Database schema (feature_flags table) - LEGACY, needs revision
- [x] 40-02-PLAN.md - useFeatureFlags hook and Header RFI integration - LEGACY, partially reusable
- [x] 40-03-PLAN.md - Feature Flags admin page - LEGACY, to be replaced
- [ ] 40-04-PLAN.md - Super-admin database schema and global feature flags
- [ ] 40-05-PLAN.md - Admin app UI and authentication

### Phase 41: Control Tester Visibility Fix
**Goal:** Fix controls not visible for control testers while controls are assigned to them
**Depends on:** Phase 40
**Requirements:** BUG-03 (Control Tester visibility fix)
**Success Criteria** (what must be TRUE):
  1. Control Testers can see controls assigned to them in the UI
  2. Assigned controls display correctly in Controls Hub for testers
  3. Control tests assigned to testers are visible and completable
  4. RLS policies correctly filter by assigned_tester_id
**Plans:** 1 plan

Plans:
- [x] 41-01-PLAN.md - Fix demo mode ID mismatch and migrate existing mock string assignments

### Phase 42: Verify Invitation Flow
**Goal:** Confirm the invitation flow correctly sets app_metadata (tenant_id, role) for new users
**Depends on:** Phase 41
**Requirements:** AUTH-01, USER-01 (verification)
**Success Criteria** (what must be TRUE):
  1. Director can send invitation to new email address
  2. Invited user receives email and can accept invitation
  3. After accepting, user's auth.users.raw_app_meta_data contains tenant_id and role
  4. New user can immediately access tenant data (RLS works without manual SQL fix)
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 42 to break down)

### Phase 43: Signup Button Visibility
**Goal:** Super-admin can toggle signup button visibility on login page for all visitors
**Depends on:** Phase 42
**Requirements:** ADMIN-02 (signup visibility control)
**Success Criteria** (what must be TRUE):
  1. Super-admin can toggle signup button on/off from admin panel
  2. Toggle state stored in global_feature_flags table (reuse Phase 40 infrastructure)
  3. Login page respects flag: button visible when enabled, hidden when disabled
  4. Default state: signup button visible (backwards compatible)
  5. Unauthenticated visitors see the flag effect immediately
**Plans:** 1 plan

Plans:
- [x] 43-01-PLAN.md - Anon policy, usePublicFeatureFlags hook, LoginPage integration

### Phase 44: Super-Admin Tenant Switching
**Goal:** Super-admin can switch between all active tenants and profiles to see what each user sees
**Depends on:** Phase 43
**Requirements:** ADMIN-03 (super-admin tenant impersonation)
**Success Criteria** (what must be TRUE):
  1. Super-admin can view list of all active tenants in admin panel
  2. Super-admin can select a tenant to "view as" that tenant
  3. Super-admin can view list of profiles within selected tenant
  4. Super-admin can impersonate a specific profile to see their exact view
  5. Clear visual indicator shows when viewing as another tenant/profile
  6. Super-admin can exit impersonation mode to return to admin view
  7. No data modifications allowed while impersonating (read-only mode)
**Plans:** 4 plans

Plans:
- [ ] 44-01-PLAN.md - Database RLS policies, ImpersonationContext, useEffectiveTenant hook
- [ ] 44-02-PLAN.md - UI components (ImpersonationBanner, TenantSwitcher, ProfileSwitcher, AdminTenantsPage)
- [ ] 44-03-PLAN.md - Modify all data hooks for impersonation support
- [ ] 44-04-PLAN.md - Integration and verification checkpoint

### Phase 45: Control Test Steps
**Goal:** Controls can have defined test steps that testers follow during the record test wizard for structured, repeatable testing
**Depends on:** Phase 44
**Requirements:** UX-09 (structured test procedures)
**Success Criteria** (what must be TRUE):
  1. Control test procedure field can contain structured steps (JSON array)
  2. Each step has configurable input type: text, binary (yes/no), multiple choice, number, date
  3. Mobile test wizard displays each step separately with appropriate input control
  4. Tester can mark a step as "cannot record" with mandatory reason text
  5. Test evidence can be attached per-step (not just per-test)
  6. Controls Hub edit form allows adding/editing/reordering test steps
  7. RCT right-side control panel shows test steps in read-only view
  8. Legacy free-text test procedures continue to work (backward compatible)
  9. Database schema updated for structured steps storage
**Plans:** 4 plans

Plans:
- [ ] 45-01-PLAN.md - Database schema and type definitions for test steps
- [ ] 45-02-PLAN.md - Controls Hub TestStepsEditor with drag-drop reordering
- [ ] 45-03-PLAN.md - Mobile wizard extension with dynamic procedure steps
- [ ] 45-04-PLAN.md - Read-only displays and verification checkpoint

## Progress

**Execution Order:** 21 -> 22 -> 23 -> 24 -> 25 -> 26 -> 26.1 -> 26.2 -> 27 -> 28 -> 29 -> 30 -> 31 -> 32 -> 33 -> 34 -> 35 -> 36 -> 37 -> 38 -> 39 -> 40 -> 41 -> 42 -> 43 -> 44 -> 45

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 21. Database & Auth Foundation | v2.0 | 7/7 | Complete | 2026-01-24 |
| 22. Authorization & User Management | v2.0 | 5/5 | Complete | 2026-01-24 |
| 23. Email & Scheduling | v2.0 | 5/5 | Complete | 2026-01-25 |
| 24. Demo Seeders & Deployment | v2.0 | 5/5 | Complete | 2026-01-28 |
| 25. Production Hardening | v2.0 | 3/3 | Complete | 2026-01-26 |
| 26. Shared Tenant Database | v2.0 | 9/9 | Complete | 2026-01-27 |
| 26.1 Database Integration Gaps | v2.0 | 5/5 | Complete | 2026-01-27 |
| 26.2 Additional Data Sync | v2.0 | 4/4 | Complete | 2026-01-27 |
| 27. Sunburst Enhancements | v2.0 | 5/5 | Complete | 2026-01-27 |
| 28. Matrix Invertible Display | v2.0 | 3/3 | Complete | 2026-01-27 |
| 29. Demo Tenant Seed Data | v2.0 | 3/3 | Complete | 2026-01-27 |
| 30. Matrix Resizable Headers | v2.0 | 2/2 | Complete | 2026-01-27 |
| 31. Controls Hub UI Fix | v2.0 | 2/2 | Complete | 2026-01-28 |
| 32. RCT L4/L5 Taxonomy Display | v2.0 | 1/1 | Complete | 2026-01-28 |
| 33. RCT Column Auto-Sizing | v2.0 | 1/1 | Complete | 2026-01-28 |
| 34. Tickets Dashboard Enhancements | v2.0 | 2/2 | Complete | 2026-01-28 |
| 35. Controls Hub Enhancements | v2.0 | 1/1 | Complete | 2026-01-28 |
| 36. Mobile Control Tester | v2.0 | 5/5 | Complete | 2026-01-28 |
| 37. RCT Search and Sort | v2.0 | 1/1 | Complete | 2026-01-28 |
| 38. Control Assignment & Hub Parity | v2.0 | 3/3 | Complete | 2026-01-28 |
| 39. Create Request for Information Document | v2.0 | 1/1 | Complete | 2026-01-28 |
| 40. Admin Feature Visibility | v2.0 | 3/5 | In Progress | - |
| 41. Control Tester Visibility Fix | v2.0 | 1/1 | Complete | 2026-01-28 |
| 42. Verify Invitation Flow | v2.0 | 0/0 | Not Started | - |
| 43. Signup Button Visibility | v2.0 | 1/1 | Complete | 2026-01-28 |
| 44. Super-Admin Tenant Switching | v2.0 | 4/4 | Complete | 2026-01-28 |
| 45. Control Test Steps | v2.0 | 0/4 | Not Started | - |

---
*Roadmap created: 2026-01-24*
*v2.0 phases: 21-45 (26 phases)*
