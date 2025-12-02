# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Enable organizations to see which business processes face unacceptable risks and ensure controls are in place where needed.
**Current focus:** Phase 45 - Control Test Steps (In Progress)

## Current Position

Phase: 45 (Control Test Steps)
Plan: 3 of N complete
Status: In Progress
Last activity: 2026-01-28 - Completed 45-03-PLAN.md

Progress: [######--------------] 30% (phase 45: 3/N plans complete)

**Next:** 45-04 (if planned)

## Performance Metrics

**v1.0 Milestone (Shipped):**
- Total plans completed: 77
- Total phases: 22 (including decimal phases)
- Timeline: 6 days (2026-01-19 to 2026-01-24)
- Codebase: 23,031 LOC TypeScript

**v2.0 Milestone (Current):**
- Total plans completed: 63
- Average duration: 5.2 min
- Total execution time: 4.82 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 21 | 7 | 88 min | 12.6 min |
| 22 | 6 | 29 min | 4.8 min |
| 23 | 5 | 35 min | 7.0 min |
| 24 | 4 | 20 min | 5.0 min |
| 25 | 3 | 21 min | 7.0 min |
| 26 | 8 | 35 min | 4.4 min |
| 26.1 | 5 | 39 min | 7.8 min |
| 26.2 | 4 | 17 min | 4.25 min |
| 27 | 5 | 17 min | 3.4 min |
| 28 | 3 | 8 min | 2.67 min |
| 29 | 3 | 19 min | 6.3 min |
| 30 | 2 | 8 min | 4.0 min |
| 31 | 2 | 12 min | 6.0 min |
| 32 | 1 | 4 min | 4.0 min |
| 33 | 1 | 4 min | 4.0 min |
| 34 | 2 | 7 min | 3.5 min |
| 35 | 1 | 3 min | 3.0 min |
| 36 | 5 | 26 min | 5.2 min |
| 37 | 1 | 5 min | 5.0 min |
| 38 | 3 | 13 min | 4.3 min |
| 39 | 1 | 5 min | 5.0 min |
| 40 | 5 | 20 min | 4.0 min |
| 41 | 1 | 4 min | 4.0 min |
| 43 | 1 | 4 min | 4.0 min |
| 44 | 4 | 75 min | 18.75 min |
| 45 | 3 | 18 min | 6.0 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v2.0 Research]: Supabase + RLS for multi-tenancy (most secure pattern)
- [v2.0 Research]: React Query + Supabase cache helpers for server state
- [v2.0 Research]: app_metadata (not user_metadata) for tenant_id claims
- [21-02]: Tenants table has no RLS - access controlled via profiles
- [21-02]: 5 roles defined: director, manager, risk-manager, control-owner, control-tester
- [21-02]: auth.tenant_id() helper function for all RLS policies
- [21-03]: useAuth() hook pattern for auth state consumption
- [21-03]: AuthProvider wraps entire app for universal auth access
- [21-03]: AUTH-02 email verification enforced in ProtectedRoute
- [21-04]: Zod validation before API calls for auth forms
- [21-04]: Success state pattern for multi-step flows (signup, password reset)
- [21-04]: Location state for passing email between auth pages
- [21-05]: Support both 'email' and 'signup' verification token types
- [21-05]: Auth callback pattern with verifyOtp and token_hash
- [21-06]: IP address logging deferred - requires Edge Function
- [21-06]: RLS helper functions in public schema (not auth) for policy access
- [21-06]: user_role() returns TEXT not enum for cross-schema compatibility
- [21-07]: CORS configured via Supabase Dashboard (not SQL)
- [21-07]: Manual type generation with CLI alternative documented
- [21-07]: Type aliases (Tenant, Profile, etc.) for ergonomics
- [22-01]: Directors cannot invite other Directors (role constraint excludes 'director')
- [22-01]: Self-deactivation blocked via id != auth.uid() check
- [22-01]: is_user_active() uses SECURITY DEFINER for restricted context access
- [22-02]: Director role at top of hierarchy (above Manager) for user management
- [22-02]: isDemoMode detected when authRole is null (no JWT = demo)
- [22-02]: INVITABLE_ROLES excludes Director (bootstrap-only)
- [22-03]: Graceful email fallback when RESEND_API_KEY not configured
- [22-03]: email_confirm: true for invited users (pre-verified via invite link)
- [22-03]: Profile creation rollback: delete auth user if profile insert fails
- [22-05]: AcceptInvitePage uses motion/react matching existing auth pages
- [22-05]: ProfilePage read-only email/role (security - cannot self-modify)
- [22-05]: Separate forms for name/password with independent feedback states
- [22-04]: Native HTML select for InviteUserDialog (matches project patterns)
- [22-04]: Admin components in src/components/admin/ directory
- [23-01]: Always return 200 from Send Email Hook to not block auth flow
- [23-01]: Send welcome email immediately with signup verification
- [23-01]: Use webhook signature verification via standardwebhooks library
- [23-02]: Return 200 with emailSent: false for graceful notification handling
- [23-02]: Use auth.admin.getUserById for recipient email lookup
- [23-02]: Type-discriminated notification payloads for routing
- [23-03]: Dual auth pattern for cron functions (service role OR cron secret)
- [23-03]: Stub queries as comments for future database tables
- [23-03]: BATCH_SIZE = 50 for Edge Function batch processing
- [23-04]: JSONB for email_preferences allows future extensibility
- [23-04]: Default to enabled if preferences not set (safe default)
- [23-04]: Preference map links notification types to preference keys
- [23-05]: Fire-and-forget pattern for notifications (never block user flow)
- [23-05]: Utility function for Zustand stores (can't use React hooks)
- [23-05]: Query profiles for Manager IDs on each pending change (fresh data)
- [24-02]: Use sm: (640px) as primary responsive breakpoint for mobile
- [24-02]: 44px touch targets for mobile usability (min-h-[44px])
- [24-02]: Stack info rows vertically on mobile (flex-col sm:flex-row)
- [24-01]: SeedTaxonomyItem excludes id/hierarchicalId (generated at insert)
- [24-01]: deps.ts duplicates types for Deno compatibility
- [24-01]: Curated RCT pairings (15-20 per preset) instead of full crossproduct
- [24-04]: Edge Function returns JSON for Zustand store loading (no DB tables yet)
- [24-04]: Director-only access enforced via JWT app_metadata check
- [24-04]: TenantSetupPage is protected route but outside Layout (standalone wizard)
- [24-04]: Path-based taxonomy lookup for RCT pairing resolution
- [25-01]: App-level ErrorBoundary wraps AuthProvider and all child components
- [25-01]: DEV-only error message display for debugging
- [25-01]: RouteErrorBoundary created for future route-level isolation
- [25-02]: Frontend logger outputs JSON in production, readable format in development
- [25-02]: Edge Functions use inline logStructured helper for Deno compatibility
- [25-02]: Email addresses masked as first 3 chars + ***@domain in logs
- [25-02]: Request ID (UUID) generated at function start for end-to-end tracing
- [25-03]: Analytics/SpeedInsights render at app root in main.tsx for global coverage
- [25-03]: UptimeRobot for external monitoring (free tier, 5-min intervals, email alerts)
- [26-02]: TicketStatus includes 'review' to match TypeScript type
- [26-02]: approval_settings has no DELETE grant (singleton per tenant)
- [26-02]: JSONB DEFAULT patterns: '[]' for arrays, '{}' for objects
- [26-01]: Single taxonomy_nodes table for both risk/process with type column
- [26-01]: Adjacency list + UUID[] path array for hierarchy (not ltree)
- [26-01]: GENERATED ALWAYS AS columns for net_score, gross_score, within_appetite
- [26-01]: Trigger auto-generates hierarchical_id on taxonomy node insert
- [26-01]: JSONB custom_values for user-defined RCT columns
- [26-03]: Query client defaults: 5min staleTime, 30min gcTime, retry once
- [26-03]: QueryProvider wraps inside ErrorBoundary but outside AuthProvider
- [26-03]: buildTree converts flat DB rows to nested TaxonomyItem[] structure
- [26-03]: getEffectiveWeight as pure function (not hook) for flexibility
- [26-04]: toControl/toRCTRow transformer functions for snake_case to camelCase mapping
- [26-04]: Optimistic updates for update/delete provide instant UI feedback
- [26-04]: RCTRowData simplified DB type; full RCTRow taxonomy join in component layer
- [26-04]: Query key pattern: ['entity'], ['entity', id], ['entity', 'filter', value]
- [26-05]: Extended types.ts with 7 new table definitions for secondary entities
- [26-05]: Domain transformation functions (toXxx) for DB row to app type conversion
- [26-06]: Single channel for all Realtime subscriptions (efficient vs per-table)
- [26-06]: isFirstRender ref guard for React Strict Mode double-mount prevention
- [26-06]: RealtimeProvider inside AuthProvider (requires session context)
- [26-05]: Upsert with onConflict for idempotent score label updates
- [26-07]: Authenticated users don't persist data to localStorage (uses DB)
- [26-07]: UI preferences (columnVisibility, columnOrder) persist regardless of auth
- [26-07]: isDemoMode checks Supabase session token in localStorage
- [26-07]: useTenantData aggregates all query loading states
- [26-08]: TaxonomyTree accepts mutation callbacks as props (not internal hooks)
- [26-08]: Client-side denormalization of RCT rows with taxonomy hierarchy data
- [26-08]: Comments stored in customValues JSONB for RCT rows
- [26-08]: Loading state shown only when authenticated (not demo mode)
- [26.1-01]: Bulk upsert preserves existing row data - no DELETE for orphaned rows
- [26.1-01]: Toast feedback distinguishes new rows added vs already up-to-date
- [26.1-04]: Minimal denormalization for matrix scoring (IDs only, no names needed)
- [26.1-04]: denormalizeForMatrix function converts DB rows to RCTRow for scoring
- [26.1-02]: ControlPanel uses dual-source pattern: storeControls/storeControlLinks for demo, dbControls/dbControlLinks for auth
- [26.1-02]: Database mutations chained: addControl creates control, onSuccess links to row
- [26.1-05]: Pass controlLinks/controls as parameters instead of using getState() for net score
- [26.1-05]: denormalizeForSunburst function for DB row to RCTRow transformation
- [26.1-03]: handleCustomValueChange uses unified rows variable for dual-mode compatibility
- [26-09]: useProfiles hook created for fetching control testers from database
- [26-09]: ControlDetailPanel denormalizes riskName/processName from taxonomy for Link Dialog
- [26-09]: Knowledge base not yet synced - stored in localStorage only (future enhancement)
- [26.2-01]: ApprovalQueue dual-source pattern: isDemoMode ? storeAction : dbMutation
- [26.2-01]: Reviewer identity uses user.email from auth context with 'unknown' fallback
- [26.2-03]: Analytics dual-source: storeData for demo, dbData for authenticated
- [26.2-03]: L1 category lookup from taxonomy path[0]
- [26.2-03]: Separate DB queries for rct_rows, taxonomy_nodes, control_links (no complex joins)
- [26.2-02]: extractFieldChanges for JSONB old_data/new_data comparison in audit log
- [26.2-02]: Entity type mapping from DB snake_case to app camelCase in audit entries
- [26.2-04]: Knowledge base uses TEXT[] for tags and related_control_types
- [26.2-04]: Category enforced via CHECK constraint at database level
- [26.2-04]: toKnowledgeBaseEntry transformer for DB to app type conversion
- [27-01]: Filter L1 nodes BEFORE d3 partition layout to close gaps (not just hide)
- [27-01]: maxVisibleDepth calculated from visibleLevels toggles for dynamic sizing
- [27-01]: ringWidth = availableRadius / maxVisibleDepth for proportional expansion
- [27-02]: Animation plays only once per mount via hasAnimatedRef guard
- [27-02]: Labels hidden during opening animation for cleaner visual
- [27-02]: Center reveals after arcs complete (animationComplete state)
- [27-02]: motion.circle and motion.text for SVG-compatible animations
- [27-03]: Show AVG/MAX only at root view, node name when zoomed
- [27-03]: Compact legend uses semi-transparent background with backdrop blur
- [27-03]: Legend positioned top-right to avoid overlap with chart arcs
- [28-01]: LabelMode type with 'id', 'name', 'both' options for label display
- [28-01]: isInverted default false (processes as rows, risks as columns)
- [28-01]: Display settings (isInverted, riskLabelMode, processLabelMode) in matrixStore with localStorage persistence
- [28-02]: Inversion toggle uses ArrowLeftRight icon with Normal/Inverted labels
- [28-02]: Native HTML select for label mode dropdowns (matching project patterns)
- [28-02]: Vertical dividers separate toolbar control groups visually
- [28-03]: formatLabel helper centralizes label formatting logic for reuse
- [28-03]: Derived variables (columnItems, rowItems) avoid conditional rendering complexity
- [28-03]: Score map key always uses risk-process order regardless of visual inversion
- [27-05]: Scale starts at 0.3 (30%) for visible fan effect without disappearing
- [27-05]: Legend bar uses clipPath inset animation for top-to-bottom reveal
- [27-05]: Label opacity fades staggered: high label first, low label last
- [27-04]: Minimum 400px chart size to prevent unusably small charts
- [27-04]: ResizeObserver pattern for responsive container sizing
- [27-04]: Dynamic label truncation: arc length * 0.8 / 6px per char
- [29-01]: 61 nodes total: 5 L1 + 16 L2 + 32 L3 + 4 L4 + 4 L5
- [29-01]: DO block pattern for clean variable-based parent references in seed scripts
- [29-01]: 2 deep branches showcase L5 depth (Cybersecurity->APT, Compliance->Annual Renewal)
- [29-02]: 56 nodes total: 6 L1 + 21 L2 + 23 L3 + 2 L4 + 4 L5
- [29-02]: 6 L1 categories: Core Operations, Sales & Marketing, Support Functions, Procurement, Management, Compliance & Risk
- [29-02]: 2 deep branches: Financial Reporting->Regulatory Filings->Annual Report, Manufacturing->Assembly->Final Assembly
- [29-03]: 28 RCT rows with varied gross scores (4-20) demonstrating full risk spectrum including 3 L5 depth test rows
- [29-03]: 15 controls with mix of types: Preventative (7), Detective (5), Corrective (3)
- [29-03]: 20 control tests distribution: 12 pass, 4 partial, 4 fail with realistic evidence
- [29-03]: 5 remediation plans: 1 open/critical, 2 in-progress, 1 resolved, 1 closed
- [29-03]: Name-based taxonomy lookup for foreign key references (portability over hardcoded UUIDs)
- [30-01]: 60px default size for both columns and rows
- [30-01]: Column clamp range 40-400px, row clamp range 30-200px
- [30-02]: Incremental delta calculation during drag for smooth resizing
- [30-02]: 8px per char heuristic for auto-fit column width estimation
- [30-02]: Pointer capture API for reliable drag outside handle bounds
- [31-01]: Debug logging added to ControlPanel for data flow verification
- [31-01]: Action items mutations use full array replacement (not individual toggles) for database
- [31-01]: Priority calculated from grossScore during authenticated plan creation
- [31-01]: Wrapper handler pattern: create handler functions that dispatch to store or mutation based on isDemoMode
- [32-01]: L5 test rows use existing L3 process nodes paired with L5 risk nodes (and vice versa)
- [32-01]: Debug logging only fires when L4/L5 values exist to avoid console noise
- [33-01]: Use 120px default column width for RCT (vs 60px in matrix) for better text readability
- [33-01]: Reuse ResizeHandle from matrix for consistent UX across components
- [33-01]: Persist columnWidths as UI preference in both demo and auth modes
- [34-01]: uiStore for UI layout preferences (collapsible sections)
- [34-01]: Zustand persist middleware for ticketSummaryVisible preference
- [34-02]: Set<string> for selectedEntityIds provides O(1) lookup for checkbox state
- [34-02]: Clear selections when switching entity type tabs prevents stale selection bugs
- [34-02]: Multi-select checkbox list: max-h-40 overflow-y-auto with divide-y styling
- [35-01]: Settings2 icon + count on left of control name (always visible, matching RCT pattern)
- [35-01]: Both icon-button and name text clickable to open detail panel
- [35-01]: Removed Linked Risks and Risk Names columns (info available in detail panel)
- [36-02]: IndexedDB auto-increment for queue entry IDs
- [36-02]: queuedAt timestamp added to pending entries for ordering
- [36-02]: wasOfflineRef pattern to detect online transition (not just online state)
- [36-02]: Sequential sync with continue-on-error for individual test failures
- [36-04]: SCHED-03 remediation reminders kept as stub - lower priority, owner_id needs verification
- [36-04]: Auth user email fetched via admin API since not in RLS-accessible profiles
- [36-04]: Detailed skip logging (warn for errors, info for inactive) for production debugging
- [36-01]: VitePWA with autoUpdate registerType for seamless background updates
- [36-01]: maximumFileSizeToCacheInBytes: 5MB to cache large JS bundle
- [36-01]: NetworkFirst strategy for Supabase API with 24h cache expiration
- [36-01]: ReloadPrompt pattern: virtual:pwa-register/react hook + sonner toast
- [36-03]: capture="environment" for rear camera (evidence photos)
- [36-03]: 4-step wizard: Review > Result > Evidence > Submit
- [36-03]: Jargon-free labels: Pass/Fail/Partially (not Effective/Ineffective)
- [36-03]: Full-screen overlay for immersive mobile wizard experience
- [36-03]: Photo URL and notes combined into single evidence field
- [37-01]: All RCT columns sortable by default (including Controls column)
- [37-01]: includesString filter searches across ALL text columns automatically
- [37-01]: Sort icons positioned in header next to filter buttons
- [38-02]: Testing and Remediation sections require linked rows - show info message if no rows linked
- [38-02]: Tickets and Comments sections render for all controls regardless of linked rows
- [38-02]: Demo profiles use fixed UUIDs for idempotent seeding
- [38-01]: Assignment dropdown placed after Control Type for consistent layout
- [38-01]: Demo mode shows hardcoded tester options (tester-1, tester-2, tester-3)
- [38-01]: Notification sent only when assigning to different tester (not when clearing or re-assigning same)
- [38-01]: Assigned To column shows dash (-) for unassigned controls
- [38-03]: Control Testers and Control Owners use same filter mechanism (assigned_tester_id)
- [38-03]: Demo mode bypasses role filtering to show all controls
- [38-03]: shouldFilterByAssignment flag centralizes role-based data source selection
- [39-01]: Lazy load RFI dialog to avoid ~500KB PDF library impact on main bundle
- [39-01]: Static RFI content separated into rfiContent.ts for maintainability
- [39-01]: Built-in Helvetica font used (no custom font complexity)
- [40-01]: JSONB for feature_overrides allows flexible per-user overrides without schema changes
- [40-01]: Director-only write access enforced via RLS policies
- [40-01]: Feature flag lookup pattern: tenant_id + feature_key unique constraint
- [40-02]: Type-safe FeatureKey union for known features (compile-time safety)
- [40-02]: Demo mode shows all features (no restrictions for sales demos)
- [40-02]: User override takes priority over global flag (per-user customization)
- [40-02]: Feature flag hook pattern: isFeatureEnabled(key) with convenience accessors
- [41-01]: Demo mode assignment uses real profile UUIDs (not mock strings like "tester-1")
- [41-01]: DEMO_TESTERS constant mirrors UUIDs from 38-02-demo-profiles.sql
- [41-01]: Migration script unnecessary - UUID column type prevented mock strings from ever being stored
- [41-01]: Root cause was missing app_metadata (tenant_id, role) in auth.users for invited users - RLS depends on JWT claims
- [40-03]: Reuse canViewUserManagement permission for Feature Flags (same Director-only access)
- [40-03]: Two-column layout with flag list on left, user overrides on right
- [40-03]: Admin hook pattern: useFeatureFlagAdmin mirrors useUserManagement structure
- [40-04]: Super-admin is a developer account with is_super_admin=true in profiles
- [40-04]: Super-admins have tenant_id=NULL (not tied to any tenant)
- [40-04]: CHECK constraint enforces tenant_id required for non-super-admins
- [40-04]: Global feature flags (global_feature_flags table) have no tenant_id - affect ALL tenants
- [40-04]: RLS on global_feature_flags: read for all authenticated, write only for super-admins
- [40-05]: Admin app at /admin/* routes with separate AdminLayout (not in ProtectedRoute)
- [40-05]: useFeatureFlags queries global_feature_flags (not tenant-scoped feature_flags)
- [40-05]: Priority chain: User override > Global flag > Demo default
- [43-01]: Anon role gets SELECT on global_feature_flags for unauthenticated access
- [43-01]: Default show_signup=true for backwards compatibility
- [43-01]: usePublicFeatureFlags has no AuthContext dependency (avoids circular deps on login page)
- [43-01]: Show signup link while loading (defaults to true) to avoid content flash
- [44-01]: sessionStorage (not localStorage) for impersonation - session-scoped, auto-clears on tab close
- [44-01]: isReadOnly always true when impersonating - prevent accidental modifications
- [44-01]: Profile selection stores role for downstream permission checking
- [44-01]: tenants table now has RLS enabled with own-tenant and super-admin policies
- [44-02]: full_name column used for profile display (matches existing profiles schema)
- [44-02]: Role color coding: purple=director, blue=manager, green=risk-manager, yellow=control-owner
- [44-02]: Disabled state for inactive profiles (cannot impersonate inactive users)
- [44-02]: Two-column layout for tenant and profile selection (responsive md:grid-cols-2)
- [44-03]: effectiveTenantId appended to queryKey for cache isolation between tenants
- [44-03]: Explicit tenant_id filter added in queryFn when isImpersonating to override RLS cross-tenant read
- [44-03]: isReadOnly check at start of mutationFn with toast error for user feedback
- [44-03]: Optimistic update query keys updated to include effectiveTenantId for correct rollback
- [44-04]: ImpersonationProvider wraps inside AuthProvider, outside RealtimeProvider
- [44-04]: ImpersonationBanner rendered at top of both AdminLayout and main Layout for visibility
- [44-04]: effectiveRole used for permissions when impersonating a specific profile
- [44-04]: effectiveProfileId used for tester controls, feature overrides, and dashboard filtering
- [45-01]: Both JSONB columns (test_steps, step_responses) nullable for backward compatibility
- [45-01]: TestStep.id uses UUID for stable identity across reorders
- [45-01]: StepResponse.value is union type (string|number|boolean|null) to support all input types
- [45-01]: Index on test_steps IS NOT NULL for filtering controls with steps
- [45-02]: Color-coded type badges (text=blue, binary=green, choice=purple, number=orange, date=cyan)
- [45-02]: Multiple choice validation requires minimum 2 options
- [45-02]: Test steps persist immediately via doUpdateControl - no explicit save button
- [45-03]: Dynamic wizard steps built with useMemo from control.testSteps
- [45-03]: Map<string, StepResponse> for efficient step response lookup
- [45-03]: CannotRecord requires minimum 10-character reason
- [45-03]: Per-step evidence via PhotoUpload component
- [45-03]: Legacy controls (no testSteps) work unchanged - backward compatible

### Pending Todos

- Configure Vault secrets for pg_cron (manual step in Supabase SQL Editor)
- Add CRON_SECRET environment variable to Vercel
- Run `npx supabase db push` when Docker/Supabase is available (applies migrations 00013-00034)

### Blockers/Concerns

- [Research]: Custom Access Token Auth Hook pattern needs validation for 5 roles
- [23-03]: Scheduled reminders awaiting controls/remediation_plans database tables (26-01/26-02 created these, pending migration push)
- [41-01]: Users created directly in Supabase (not via invitation flow) need manual app_metadata setup - verify invitation flow sets tenant_id/role correctly

### Roadmap Evolution

- Phase 26 added: Shared Tenant Database - persist application data to Supabase so all tenant users share the same data
- Phase 26.1 inserted after Phase 26: Database Integration Gaps - Fix remaining components not wired to database (URGENT)
- Phase 26.2 inserted after Phase 26.1: Additional Data Sync - Approval queue, audit trail, analytics, knowledge base
- Phase 27 added: Sunburst Enhancements - Dynamic sizing, animations, legend integration, center text, UX polish
- Phase 28 added: Matrix Invertible Display - Row/column swap and configurable label display modes
- Phase 29 added: Demo Tenant Seed Data - Populate demo tenant with generic risk management data (taxonomy, controls, remediation, RCT)
- Phase 30 added: Matrix Resizable Headers - Drag to resize row/column headers for readability
- Phase 31 added: Controls Hub UI Fix - Fix controls and remediation plans not displaying in authenticated mode
- Phase 32 added: RCT L4/L5 Taxonomy Display - Fix L4 and L5 taxonomy levels not showing in RCT columns
- Phase 33 added: RCT Column Auto-Sizing - Auto-fit column widths matching Risk Process Matrix behavior
- Phase 34 added: Tickets Dashboard Enhancements - Collapsible statistics rows and multi-select linking
- Phase 35 added: Controls Hub Enhancements - Remove risk names column, add clickable control icons
- Phase 36 added: Mobile Control Tester - Dedicated mobile experience for first-line testers with guided workflows, reminders, and offline support
- Phase 37 added: RCT Search and Sort - Searchable RCT with column sorting (A-Z/Z-A)
- Phase 38 added: Control Assignment & Hub Parity - Assignment UI in RCT panel, Controls Hub data parity, assignee column, fix tester dropdown
- Phase 39 added: Create Request for Information Document - Generate RFI document for procurement/vendor assessment workflows
- Phase 40 added: Admin Feature Visibility - Developer admin panel to toggle feature visibility per user/globally (starting with RFI)
- Phase 41 added: Control Tester Visibility Fix - Fix controls not visible for control testers while controls are assigned
- Phase 42 added: Verify Invitation Flow - Test end-to-end invitation flow sets app_metadata correctly
- Phase 43 added: Signup Button Visibility - Super-admin toggle for signup button visibility on login page
- Phase 44 added: Super-Admin Tenant Switching - Super-admin can switch between all active tenants and profiles to see what each user sees
- Phase 45 refined: Added detailed requirements for step input types (text, binary, multiple choice, number, date), "cannot record" with reason, and database schema updates

## Session Continuity

Last session: 2026-01-28 21:00 UTC
Stopped at: Completed 44-04-PLAN.md (app integration and verification)
Resume file: None
