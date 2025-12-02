---
status: resolved
trigger: "data-sync-inventory: Multiple features may not be synced between tenant users"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:15:00Z
---

## Current Focus

hypothesis: CONFIRMED - Multiple features use localStorage-only stores without database backing
test: Checked each feature for database table, React Query hook, and dual-source pattern
expecting: Table showing sync status for each feature
next_action: Report complete - see resolution

## Symptoms

expected: All application data should sync between users in the same tenant when authenticated
actual: User reports these features don't sync: knowledge base, approval queue, analytics dashboard (risk aggregation), audit trail
errors: None - this is a feature gap inventory
reproduction: Log in as two different users in same tenant, check if data is shared
started: Phase 26 implemented core data sync, but some features may have been missed

## Eliminated

(none - investigation complete)

## Evidence

- timestamp: 2026-01-27T10:02:00Z
  checked: collaborationStore.ts (knowledgeBaseEntries)
  found: Uses Zustand persist with localStorage, storage name 'riskguard-collaboration'
  implication: Knowledge base entries are LOCAL-ONLY, not synced

- timestamp: 2026-01-27T10:03:00Z
  checked: supabase/migrations for knowledge_base table
  found: No migration file for knowledge_base table exists
  implication: No database backing for knowledge base feature

- timestamp: 2026-01-27T10:04:00Z
  checked: approvalStore.ts (pendingChanges)
  found: Uses Zustand persist with localStorage, storage name 'riskguard-approval'
  implication: Approval queue uses localStorage for state

- timestamp: 2026-01-27T10:05:00Z
  checked: 00023_pending_changes.sql migration
  found: Database table EXISTS with full schema and RLS policies
  implication: Database table ready for pending_changes

- timestamp: 2026-01-27T10:06:00Z
  checked: usePendingChanges.ts hook
  found: Complete React Query hook with CRUD operations
  implication: Database integration code EXISTS for pending_changes

- timestamp: 2026-01-27T10:07:00Z
  checked: ApprovalPage.tsx
  found: Uses `useApprovalStore` directly, NOT usePendingChanges hook
  implication: Page NOT using database-backed hook despite it existing

- timestamp: 2026-01-27T10:08:00Z
  checked: auditStore.ts
  found: Uses Zustand persist with localStorage, storage name 'riskguard-audit'
  implication: Audit trail uses localStorage for state

- timestamp: 2026-01-27T10:09:00Z
  checked: 00004_audit_log.sql migration
  found: Database table EXISTS with trigger function for auto-logging
  implication: Database table ready for audit_log with auto-triggers

- timestamp: 2026-01-27T10:10:00Z
  checked: src/hooks for useAuditEntries or similar
  found: No React Query hook for audit_log table queries
  implication: Missing React Query hook for reading audit_log

- timestamp: 2026-01-27T10:11:00Z
  checked: useAuditLog.ts hook
  found: Uses auditStore (localStorage), not database
  implication: Audit page reads from localStorage, not database

- timestamp: 2026-01-27T10:12:00Z
  checked: useAnalyticsData.ts
  found: Uses rctStore and auditStore (both localStorage)
  implication: Analytics derives from localStorage stores, not database

- timestamp: 2026-01-27T10:13:00Z
  checked: TaxonomyPage.tsx (reference for dual-source pattern)
  found: Uses isDemoMode to switch between storeData and dbData
  implication: This is the correct pattern that should be applied to missing features

## Resolution

root_cause: Multiple features were NOT integrated with database during Phase 26. They have localStorage stores but either (a) no database table, (b) no React Query hook, or (c) page doesn't use the hook.

fix: N/A - investigation only (see findings table below)

verification: N/A

files_changed: []

---

## INVESTIGATION COMPLETE - Data Sync Inventory

### Summary Table

| Feature | DB Table | React Query Hook | Page Uses Hook | Sync Status |
|---------|----------|------------------|----------------|-------------|
| **Knowledge Base** | NO | NO | N/A | NOT SYNCED - localStorage only |
| **Approval Queue** | YES (pending_changes) | YES (usePendingChanges) | NO - uses approvalStore | NOT SYNCED - hook exists but unused |
| **Analytics Dashboard** | N/A (derived) | N/A | N/A | NOT SYNCED - depends on localStorage stores |
| **Audit Trail** | YES (audit_log) | NO | N/A | PARTIALLY SYNCED - DB has triggers, but UI reads localStorage |

### Detailed Findings

#### 1. Knowledge Base (collaborationStore.knowledgeBaseEntries)

**Status: NOT SYNCED**

- **Database table:** None exists
- **React Query hook:** None exists
- **Page:** `KnowledgeBasePage.tsx` uses `useCollaborationStore` directly
- **Store:** `collaborationStore.ts` uses localStorage (`riskguard-collaboration`)

**Work needed:**
1. Create `knowledge_base` migration
2. Create `useKnowledgeBase` React Query hook
3. Update `KnowledgeBasePage.tsx` with dual-source pattern

#### 2. Approval Queue (approvalStore.pendingChanges)

**Status: NOT SYNCED (but infrastructure exists)**

- **Database table:** `pending_changes` table EXISTS (00023_pending_changes.sql)
- **React Query hook:** `usePendingChanges.ts` EXISTS with full CRUD
- **Page:** `ApprovalPage.tsx` uses `useApprovalStore` (localStorage)
- **Store:** `approvalStore.ts` uses localStorage (`riskguard-approval`)

**Work needed:**
1. Update `ApprovalPage.tsx` to use `usePendingChanges` hook
2. Update `ApprovalQueue.tsx` component similarly
3. Add isDemoMode dual-source pattern
4. Note: `approvalStore` also has `settings` which need separate handling

#### 3. Analytics Dashboard (risk aggregation)

**Status: NOT SYNCED (derived data)**

- **Database table:** N/A - analytics are computed from RCT rows
- **React Query hook:** N/A - uses `useAggregationByCategory`
- **Hook source:** `useAnalyticsData.ts` reads from `rctStore` and `auditStore`
- **Issue:** Both source stores are localStorage-only

**Work needed:**
1. Update `useAnalyticsData.ts` hooks to use database queries
2. `useAggregationByCategory` should query `rct_rows` table
3. `useRiskScoreHistory` should query `audit_log` table
4. `useControlTestTrends` should query `control_tests` table (this one may already work if rctStore is synced)

#### 4. Audit Trail (auditStore.entries)

**Status: PARTIALLY SYNCED**

- **Database table:** `audit_log` table EXISTS (00004_audit_log.sql)
- **React Query hook:** NONE - no hook to read audit_log
- **Page:** `AuditPage.tsx` uses `useAuditLog` which reads from `auditStore`
- **Store:** `auditStore.ts` uses localStorage (`riskguard-audit`)
- **Note:** Database has triggers that auto-populate audit_log on entity changes

**Work needed:**
1. Create `useAuditEntries` React Query hook to read from `audit_log` table
2. Update `useAuditLog.ts` to use database instead of store
3. Update `AuditPage.tsx` with dual-source pattern
4. Note: Database triggers already write audit entries, so reading should show all tenant activity

### Key Files Involved

| Feature | Store File | Hook File | Page/Component |
|---------|------------|-----------|----------------|
| Knowledge Base | `src/stores/collaborationStore.ts` | (none) | `src/pages/KnowledgeBasePage.tsx` |
| Approval Queue | `src/stores/approvalStore.ts` | `src/hooks/usePendingChanges.ts` | `src/pages/ApprovalPage.tsx` |
| Analytics | `src/stores/rctStore.ts`, `auditStore.ts` | `src/hooks/useAnalyticsData.ts` | `src/components/analytics/AggregationReport.tsx` |
| Audit Trail | `src/stores/auditStore.ts` | `src/hooks/useAuditLog.ts` | `src/pages/AuditPage.tsx` |

### Priority Recommendation

1. **Approval Queue** - Highest priority, infrastructure already exists, just needs wiring
2. **Audit Trail** - High priority, database already populated by triggers
3. **Analytics** - Medium priority, derived data, depends on source tables being synced
4. **Knowledge Base** - Lower priority, requires full stack implementation
