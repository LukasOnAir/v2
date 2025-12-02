# Pitfalls Research

**Domain:** ERM/GRC Web Application (RiskGuard ERM)
**Researched:** 2026-01-19 (v1.0), 2026-01-24 (v2.0 Supabase)
**Confidence:** HIGH (verified across multiple domain-specific sources)

---

# V1.0 Client-Side Pitfalls

## Critical Pitfalls

### Pitfall 1: LocalStorage Data Limit Explosion

**What goes wrong:**
LocalStorage has a hard 5-10MB limit across all browsers. With hundreds of risks x hundreds of processes generating thousands of RCT (Risk-Control Table) rows, plus full taxonomy trees, the application silently fails when storage quota is exceeded. Users lose data without warning.

**Why it happens:**
Developers underestimate data growth. Initial testing with small datasets (10 risks, 5 processes) works perfectly. But production-like data (200 risks x 150 processes = 30,000 RCT rows) with JSON stringification overhead easily exceeds 5MB.

**How to avoid:**
1. Calculate realistic data size early: `(num_risks * num_processes * avg_row_size_bytes) + taxonomy_overhead`
2. Implement storage monitoring from day one with `useLocalStorageSize()` custom hook
3. Design with compression (LZ-String) or IndexedDB fallback from the start
4. Add QuotaExceededError handling with graceful degradation
5. For demo: Pre-calculate maximum safe dataset size and enforce limits

**Warning signs:**
- "QuotaExceededError" in console during development testing
- Data silently failing to persist
- Application state not surviving page refresh with larger datasets
- JSON.stringify() taking >100ms for state serialization

**Phase to address:**
Phase 1 (Foundation) - Data layer architecture must account for this from the start. Retrofitting is expensive.

---

### Pitfall 2: Hierarchical Tree Performance Collapse

**What goes wrong:**
With 5-level deep taxonomies, naive recursive rendering causes browser freezes. MUI TreeView reports stack overflow with >5,000 items. Collapsing/expanding parent nodes triggers O(n) re-renders of all children.

**Why it happens:**
React's reconciliation process re-renders all children when parent state changes. Without virtualization, every node creates DOM elements. A taxonomy tree with 500 items at 5 levels deep generates thousands of React components.

**How to avoid:**
1. Use virtualized tree components (react-vtree, react-arborist) from the start
2. Implement lazy loading: fetch children only when parent expands (`/api/tree?parent=123` pattern)
3. Transform tree data ONCE on load, not during render
4. Use stable row IDs to prevent unnecessary reconciliation
5. Avoid lodash isEqual for deep comparison on large tree objects

**Warning signs:**
- UI freezes for >200ms when expanding tree nodes
- Browser "Page Unresponsive" warnings during tree operations
- Memory usage growing unbounded during tree interactions
- Console showing "Maximum call stack size exceeded"

**Phase to address:**
Phase 2 (Taxonomy Management) - Must be designed into taxonomy component architecture, not bolted on later.

---

### Pitfall 3: Cross-Entity State Synchronization Hell

**What goes wrong:**
Taxonomies, RCT (Risk-Control Table), and RPM (Risk-Process Matrix) must stay in sync. When a risk category is renamed in taxonomy, all RCT rows referencing it become stale. Deleting a process breaks RPM relationships. Users see inconsistent data across views.

**Why it happens:**
Developers model entities independently without relationship constraints. No foreign key enforcement in client-side state. Updates to one entity don't cascade to dependent entities.

**How to avoid:**
1. Design normalized state with explicit relationships (IDs, not embedded objects)
2. Implement derived state pattern - don't duplicate, calculate on the fly
3. Create cascading update actions in Zustand store (e.g., `deleteRisk` also updates RCT, RPM)
4. Use referential integrity checks before destructive operations
5. Add "sync status" indicators when relationships might be stale

**Warning signs:**
- "Undefined" appearing in dropdowns or tables after editing related entities
- Different counts/values showing in different views for same data
- Users reporting "ghost" entries that were supposedly deleted
- Complex useEffect chains trying to synchronize multiple state slices

**Phase to address:**
Phase 1 (Foundation) - Data model design must establish relationships. All subsequent phases depend on this.

---

### Pitfall 4: Risk Taxonomy Definition Ambiguity

**What goes wrong:**
Without clear, mutually exclusive category definitions, the same risk gets classified differently by different users. "Operational" vs "Strategic" vs "Business" risk boundaries blur. Risk aggregation and reporting become meaningless because categories overlap.

**Why it happens:**
GRC implementations often skip defining a formal risk taxonomy with definitional clarity. Categories are created ad-hoc. No guidance on which category to use for edge cases.

**How to avoid:**
1. Pre-define taxonomy categories with explicit definitions and examples
2. Implement category descriptions/help text in the UI
3. Include "category guidance" when adding new risks
4. Design taxonomy to be MECE (Mutually Exclusive, Collectively Exhaustive)
5. Add validation rules to prevent ambiguous classification

**Warning signs:**
- Users asking "which category should this go in?"
- Same risk type appearing under multiple categories
- Risk reports showing illogical aggregations
- Stakeholders questioning data quality

**Phase to address:**
Phase 2 (Taxonomy Management) - Before any risk data entry, taxonomy structure must be finalized with clear definitions.

---

### Pitfall 5: Auto-Generated RCT Combinatorial Explosion

**What goes wrong:**
Auto-generating RCT from all risk x process combinations creates unmanageable datasets. 200 risks x 150 processes = 30,000 rows. Most are irrelevant (Finance risks don't apply to Marketing processes). Users are overwhelmed, performance degrades.

**Why it happens:**
Developers implement "generate all combinations" as the simplest approach. Business logic about which risks apply to which processes is deferred or ignored.

**How to avoid:**
1. Implement smart filtering: generate only applicable combinations
2. Add "risk applicability" mapping to processes before generation
3. Provide wizard-based generation with user selection
4. Support incremental generation (add new risks to existing processes)
5. Include "bulk delete" for cleaning up irrelevant combinations

**Warning signs:**
- RCT table with >10,000 rows where most are empty/irrelevant
- Users complaining about "too many rows to manage"
- Performance issues rendering the full table
- Excel exports taking minutes

**Phase to address:**
Phase 3 (RCT Implementation) - Must design generation algorithm with filtering, not as post-hoc feature.

---

### Pitfall 6: Demo-Quality vs Production-Quality Confusion

**What goes wrong:**
Demo built with shortcuts (no validation, no error handling, happy-path-only) gets shown to stakeholders who expect production behavior. When edge cases fail in demo, credibility suffers. Or worse, demo code gets promoted to production without addressing shortcuts.

**Why it happens:**
Time pressure to "just make it work for the demo." Shortcuts accumulate without documentation. Technical debt invisible to non-technical stakeholders.

**How to avoid:**
1. Explicitly document what IS and ISN'T in demo scope
2. Create "demo mode" flag that shows limitations to users
3. Implement graceful error handling even in demo (show user-friendly errors, not crashes)
4. Test with realistic (Holland Casino-scale) data, not toy datasets
5. Maintain list of "production requirements" to address post-demo

**Warning signs:**
- No error boundaries or try/catch around operations
- Console errors visible during demo
- "Works on my machine" syndrome
- Hardcoded values that only work for specific test cases

**Phase to address:**
All phases - Each phase should define its demo vs production boundary explicitly.

---

### Pitfall 7: Excel-Like Filtering Performance on Large Tables

**What goes wrong:**
Implementing Excel-like column filtering on 10,000+ row tables causes UI freezes. Filter dropdown populations take seconds. Each filter change triggers full table re-render. Users give up on filtering and export to Excel instead.

**Why it happens:**
Naive filter implementation iterates entire dataset for each keystroke. No debouncing. No virtualization for filter dropdowns. Filter state stored in component state causing cascading re-renders.

**How to avoid:**
1. Use virtualized table library (TanStack Table + react-window, AG-Grid)
2. Debounce filter input (300ms minimum)
3. Memoize filter results
4. Use server-side filtering pattern even for client-side data (filter logic in store, not component)
5. Limit filter dropdown options (show top 100, add search)

**Warning signs:**
- Typing in filter causes visible lag
- Table flickers or goes blank during filtering
- Memory usage spikes during filter operations
- Filter dropdowns taking >1s to populate

**Phase to address:**
Phase 3 (RCT Implementation) - Table architecture must be built for scale from the start.

---

### Pitfall 8: Zustand Store Bloat and Selector Performance

**What goes wrong:**
Entire application state in one Zustand store. Selectors run on every update. Deep object comparison (lodash isEqual) on large risk/process datasets freezes UI. Every component re-renders on any state change.

**Why it happens:**
Single store is simpler to start. Default equality check (reference comparison) misses actual changes. Developers add deep comparison without understanding cost.

**How to avoid:**
1. Split stores by domain (taxonomyStore, rctStore, rpmStore)
2. Use selective subscriptions - subscribe only to needed state slices
3. Avoid deep comparison on large objects - use immutable updates with new references
4. Move heavy computations outside selectors
5. Use `subscribe` for non-reactive updates (e.g., analytics, logging)

**Warning signs:**
- All components re-render on any state change (React DevTools)
- State updates taking >50ms
- UI lag after user interactions
- Memory increasing without releasing

**Phase to address:**
Phase 1 (Foundation) - Store architecture patterns must be established early.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Storing full objects in arrays instead of normalized state | Simpler initial code | O(n) lookups, sync issues, duplicated data | Never for entities with relationships |
| Using LocalStorage for all persistence | No backend needed | 5MB limit, no querying, sync blocking | Demo only with size monitoring |
| Inline tree transformation during render | Quick to implement | O(n) on every render, UI freezes | Never with >100 items |
| Single monolithic Zustand store | Simpler initial setup | Re-render cascades, selector overhead | Small apps only (<20 state fields) |
| Generating all RCT combinations upfront | Complete coverage | Unmanageable data volume | Never - always use smart filtering |
| Skipping error boundaries | Faster development | Entire app crashes on any error | Never - even demos need stability |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Excel Export | Loading entire dataset into memory | Stream generation, chunked processing |
| PDF Report Generation | Client-side generation blocking UI | Web Worker or async chunked generation |
| LocalStorage Persistence | Synchronous save on every change | Debounced persist middleware |
| Browser Storage API | No quota monitoring | Check available space before large writes |
| File Upload (taxonomy import) | No validation before processing | Validate structure before state update |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Non-virtualized tree/table | UI freezes on expand/scroll | Use virtualization from start | >500 visible items |
| Deep cloning state on update | Slow updates, memory spikes | Immutable update patterns | >1000 state objects |
| Uncontrolled re-renders | Sluggish typing, input lag | Memoization, selective subscriptions | Any large dataset |
| LocalStorage JSON parsing | Slow initial load, blocking | Async parsing, lazy hydration | >1MB stored data |
| Client-side full-text search | Search taking >500ms | Indexed search (Fuse.js configured) | >5000 searchable items |
| Recursive tree traversal per operation | O(n) per interaction | Pre-computed lookup maps | >1000 tree nodes |

## Security Mistakes

Domain-specific security issues beyond general web security.

| Mistake | Risk | Prevention |
|---------|------|------------|
| Storing sensitive risk data in LocalStorage | Data accessible to any script, persists indefinitely | Use sessionStorage or encrypted storage for sensitive assessments |
| No input validation on taxonomy names | XSS via risk category names displayed throughout app | Sanitize all user input, escape on display |
| Exporting confidential risk data to unencrypted Excel | Risk register leaving controlled environment | Add export controls, watermarking, audit trail |
| Not clearing state on logout | Next user sees previous user's risk data | Clear LocalStorage on session end |
| Hardcoded demo credentials | Credential exposure in client bundle | Environment variables, not inline |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Overwhelming users with full RCT on first load | Cognitive overload, abandonment | Progressive disclosure, filtering defaults |
| No undo for destructive operations | Accidental taxonomy deletion = data loss | Soft delete with restore option |
| Technical error messages | Users don't understand what went wrong | Human-readable error explanations |
| Requiring full form completion | Users abandon mid-flow | Auto-save drafts, progressive completion |
| No visual feedback on save | Users unsure if changes persisted | Toast notifications, save status indicator |
| Complex taxonomy without guidance | Misclassification, data quality issues | Inline help, category descriptions, examples |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Taxonomy CRUD:** Often missing cascade delete handling - verify deleting a parent updates/warns about children
- [ ] **RCT Generation:** Often missing relevance filtering - verify only applicable combinations are generated
- [ ] **Data Persistence:** Often missing quota handling - verify graceful behavior when storage full
- [ ] **Table Filtering:** Often missing debounce - verify no lag with rapid filter changes
- [ ] **Excel Export:** Often missing large dataset handling - verify export works with 10,000+ rows
- [ ] **Risk Scoring:** Often missing validation - verify scores within defined ranges
- [ ] **Form Validation:** Often missing async validation - verify duplicate checking works
- [ ] **Navigation:** Often missing unsaved changes warning - verify prompt before leaving with edits
- [ ] **Error Handling:** Often missing recovery path - verify user can continue after error
- [ ] **Loading States:** Often missing skeleton/spinner - verify users know data is loading

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| LocalStorage quota exceeded | LOW | 1. Add compression (LZ-String) 2. Migrate to IndexedDB 3. Implement data pruning |
| State sync issues | MEDIUM | 1. Add referential integrity checks 2. Create data repair utility 3. Implement sync status tracking |
| Tree performance collapse | HIGH | 1. Swap component library 2. Implement virtualization 3. Restructure data loading |
| RCT combinatorial explosion | MEDIUM | 1. Add bulk delete 2. Implement filtering 3. Provide cleanup wizard |
| Zustand store bloat | HIGH | 1. Split into multiple stores 2. Normalize data 3. Refactor selectors - requires significant code changes |
| Demo code in production | HIGH | 1. Document all shortcuts 2. Create production hardening backlog 3. Systematic refactor |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| LocalStorage limits | Phase 1: Foundation | Storage monitoring shows <50% capacity with full demo data |
| Tree performance | Phase 2: Taxonomy | Expand/collapse completes in <100ms with 500+ items |
| State synchronization | Phase 1: Foundation | Editing taxonomy updates all dependent views immediately |
| Taxonomy ambiguity | Phase 2: Taxonomy | Every category has description, no overlap in definitions |
| RCT explosion | Phase 3: RCT | Generation wizard includes applicability filtering |
| Demo vs production | All phases | Each phase has explicit "demo limitations" documented |
| Table filtering | Phase 3: RCT | Filtering 10,000 rows completes in <200ms |
| Zustand bloat | Phase 1: Foundation | State updates don't trigger unrelated component re-renders |

## V1.0 Sources

### GRC/ERM Implementation
- [Why GRC Implementations Fail](https://www.linkedin.com/pulse/why-grc-implementations-fail-soumya-chakraverty) - LinkedIn article on common GRC failures
- [How to solve the top 6 GRC software implementation issues](https://blog.6clicks.com/top-6-grc-software-implementation-challenges-and-how-to-solve-them) - 6clicks blog
- [ISACA - Three Primary Reasons Why GRC Is Failing](https://www.isaca.org/resources/news-and-trends/isaca-now-blog/2025/three-primary-reasons-why-grc-is-failing-and-how-to-fix-it) - ISACA 2025 analysis
- [Gartner - ERM Struggle with GRC Tools](https://www.gartner.com/en/newsroom/press-releases/2023-11-30-gartner-says-heads-or-erm-sruggle-to-select-and-implement-grc-tools-because-of-undue-focus-on-other-stakeholders-needs) - Gartner research

### Risk Taxonomy
- [How to Develop an Enterprise Risk Taxonomy](https://www.garp.org/risk-intelligence/culture-governance/how-to-develop-an-enterprise-risk-taxonomy) - GARP guidance
- [What Is a Risk Taxonomy?](https://www.fortra.com/blog/what-risk-taxonomy-how-make-one-your-business) - Fortra guide
- [What constitutes a good risk taxonomy?](https://www.openriskmanagement.com/what-constitutes-a-good-risk-taxonomy/) - Open Risk analysis

### React Performance
- [Tree Data in React Tables](https://www.simple-table.com/blog/react-tree-data-hierarchical-tables) - Hierarchical data guide
- [MUI TreeView Performance Issue](https://github.com/mui/mui-x/issues/10300) - Real-world scale issues
- [React-vtree](https://github.com/Lodin/react-vtree) - Virtualized tree solution

### LocalStorage Limitations
- [MDN Storage quotas and eviction criteria](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - Official documentation
- [RxDB - LocalStorage in Modern Applications](https://rxdb.info/articles/localstorage.html) - Comprehensive analysis
- [ReactJS Storage - From Basic LocalStorage to Advanced](https://rxdb.info/articles/reactjs-storage.html) - React-specific guidance

### State Management
- [Don't Sync State. Derive It!](https://kentcdodds.com/blog/dont-sync-state-derive-it) - Kent C. Dodds on derived state
- [Zustand Pitfalls](https://philipp-raab.medium.com/zustand-state-management-a-performance-booster-with-some-pitfalls-071c4cbee17a) - Zustand-specific issues
- [React Choosing the State Structure](https://react.dev/learn/choosing-the-state-structure) - Official React guidance

### Table Performance
- [Build Tables in React: Data Grid Performance Guide](https://strapi.io/blog/table-in-react-performance-guide) - Strapi guide
- [AG Grid Documentation](https://www.ag-grid.com/react-table/) - Enterprise grid reference

### Demo vs Production
- [Demos, Prototypes, and MVPs](https://jacobian.org/2020/jan/16/demos-prototypes-mvps/) - Jacob Kaplan-Moss distinction

---

# V2.0 Supabase Backend Pitfalls

**Domain:** Enterprise Risk Management with Supabase Backend
**Project:** RiskGuard ERM v2.0
**Researched:** 2026-01-24
**Confidence:** HIGH (verified with official Supabase documentation)

---

## Critical Pitfalls

Mistakes that cause security breaches, data exposure, or major rewrites.

---

### Pitfall S1: Forgetting to Enable RLS on Tables

**What goes wrong:** Tables are created without Row-Level Security enabled. Supabase auto-generates REST APIs from your PostgreSQL schema, but RLS protection is opt-in, not default. Without RLS, the anon API key you intentionally embed in client code becomes "a master key to your entire database."

**Why it happens:**
- Developers create tables via raw SQL or migrations without activating RLS
- During rapid prototyping, RLS feels like "extra work"
- Assumption that authentication alone provides security

**Consequences:**
- Complete database exposure (CVE-2025-48757 affected 170+ apps in January 2025)
- Any user can read/write any data using the public anon key
- Password reset tokens, user data, and sensitive information exposed
- 83% of exposed Supabase databases involve RLS misconfigurations

**Prevention:**
- ALWAYS enable RLS immediately when creating any table
- Add to migration templates: `ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;`
- Use Supabase Security Advisor to scan for unprotected tables
- Create a pre-deployment checklist that verifies RLS on all tables

**Detection (Warning Signs):**
- Any table in `public` schema without RLS enabled
- Security Advisor warnings in Supabase dashboard
- Tables accessible without authentication in testing

**Phase to Address:** Phase 1 (Database Schema) - Set RLS as default for ALL table creation

**Sources:**
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Security Flaw Report](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)

---

### Pitfall S2: Enabling RLS Without Creating Policies

**What goes wrong:** RLS is enabled on a table but no policies are created. This results in "deny all" behavior - even authenticated users cannot access any data.

**Why it happens:**
- Developers enable RLS to "be secure" without understanding it blocks everything by default
- Policies are added later and forgotten
- Copy-paste errors where `ENABLE ROW LEVEL SECURITY` is included but policies are not

**Consequences:**
- Application appears broken (all queries return empty)
- Cryptic errors that are hard to debug
- Time wasted debugging "working" queries that return no data

**Prevention:**
- ALWAYS pair RLS enablement with at least one policy in the same migration
- Use migration templates that include both:
  ```sql
  ALTER TABLE [table] ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "[table]_tenant_isolation" ON [table]
    FOR ALL TO authenticated
    USING (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid));
  ```

**Detection (Warning Signs):**
- Tables with RLS enabled but zero policies
- Queries returning empty results for authenticated users
- Supabase dashboard showing "No policies" on RLS-enabled tables

**Phase to Address:** Phase 1 (Database Schema) - Policy templates must be part of table creation

---

### Pitfall S3: Exposing service_role Key in Client Code

**What goes wrong:** The `service_role` key is used in frontend code, mobile apps, or any client-side context. This key bypasses ALL RLS policies - it's "god mode" access.

**Why it happens:**
- Developer confusion between `anon` and `service_role` keys
- Copy-paste from server code to client code
- Quick fixes that "just make it work" during debugging

**Consequences:**
- Complete security bypass - anyone with the key has full database access
- No audit trail of who accessed what
- Cannot be revoked without regenerating (breaks all legitimate uses)

**Prevention:**
- Store `service_role` key ONLY in server-side environment variables
- Never prefix with `NEXT_PUBLIC_` or `VITE_` (client-exposed prefixes)
- Use separate Supabase client instances:
  - Client: `createClient(url, anon_key)` - for browser
  - Server: `createClient(url, service_role_key)` - for API routes only
- Add pre-commit hook to scan for service_role patterns in frontend code

**Detection (Warning Signs):**
- `service_role` key in any file under `src/`, `app/`, or client directories
- Environment variables prefixed with `NEXT_PUBLIC_` containing service keys
- RLS policies that "don't seem to work" (because service_role bypasses them)

**Phase to Address:** Phase 2 (Auth Setup) - Establish client patterns early

**Sources:**
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

---

### Pitfall S4: Using User-Modifiable JWT Claims in RLS Policies

**What goes wrong:** RLS policies rely on `raw_user_meta_data` from the JWT, which authenticated users can modify themselves. Attackers can escalate privileges by modifying their own metadata.

**Why it happens:**
- Documentation examples sometimes use `user_metadata` for simplicity
- Confusion between `user_metadata` (user-editable) and `app_metadata` (admin-only)
- Not understanding the JWT claim structure

**Consequences:**
- Users can grant themselves access to other tenants' data
- Privilege escalation by modifying role claims
- Complete tenant isolation bypass

**Prevention:**
- ONLY use `app_metadata` claims in RLS policies (cannot be modified by users)
- For tenant_id: `(auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid`
- For roles: `(auth.jwt() -> 'app_metadata' ->> 'role')`
- Set `app_metadata` only through admin/server APIs
- Create explicit policy:
  ```sql
  USING (tenant_id = (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid))
  ```

**Detection (Warning Signs):**
- RLS policies referencing `raw_user_meta_data` or `user_metadata`
- Policies using `auth.jwt() -> 'user_metadata'`
- User-facing forms that set tenant or role information

**Phase to Address:** Phase 1 (Database Schema) - Establish correct claim patterns from start

**Sources:**
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

### Pitfall S5: Views Bypassing RLS

**What goes wrong:** Views are created for convenience but bypass RLS by default. Data exposed through views ignores the underlying table's security policies.

**Why it happens:**
- Views in PostgreSQL default to `security_definer` (runs as view owner, bypassing RLS)
- Developers create views for reporting/dashboards without realizing security implications
- Works "correctly" in testing because service_role bypasses RLS anyway

**Consequences:**
- Views expose data across tenant boundaries
- Reporting dashboards leak other tenants' data
- Security audit failures

**Prevention:**
- For PostgreSQL 15+: Add `WITH (security_invoker = true)` to all views:
  ```sql
  CREATE VIEW my_view WITH (security_invoker = true) AS ...
  ```
- For older versions: Revoke direct access and use security definer functions
- Audit all views before production deployment
- Consider avoiding views entirely in multi-tenant contexts

**Detection (Warning Signs):**
- Views in the database without `security_invoker = true`
- Views returning more data than expected in security testing
- Dashboard queries showing cross-tenant data

**Phase to Address:** Phase 1 (Database Schema) - Set view security policy before creating views

**Sources:**
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

### Pitfall S6: Multi-Tenant tenant_id Confusion with auth.uid()

**What goes wrong:** Developers confuse `auth.uid()` (user's unique ID) with `tenant_id` (organization identifier). RLS policies check the wrong thing.

**Why it happens:**
- Simple tutorials show `auth.uid() = user_id` patterns
- Multi-tenancy requires organization-level isolation, not just user isolation
- Tenant ID stored in different location (profiles table, JWT claims) than expected

**Consequences:**
- Users can only see their own data (too restrictive) or all data (too permissive)
- Cross-tenant data exposure when tenant_id logic is wrong
- Broken collaboration features within a tenant

**Prevention:**
- Store `tenant_id` in `app_metadata` during user signup/invite
- Use consistent tenant_id access pattern:
  ```sql
  -- Store tenant_id in app_metadata when user joins
  -- Access in RLS:
  (SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid) = tenant_id
  ```
- Create helper function for readability:
  ```sql
  CREATE OR REPLACE FUNCTION auth.tenant_id() RETURNS uuid AS $$
    SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
  $$ LANGUAGE sql STABLE;
  ```

**Detection (Warning Signs):**
- RLS policies using `auth.uid()` for tenant isolation
- Users unable to see colleagues' data within same organization
- Confusion about which ID to use where

**Phase to Address:** Phase 1 (Database Schema) - Establish tenant isolation pattern first

---

### Pitfall S7: Missing SELECT Policy Causing INSERT Failures

**What goes wrong:** INSERT operations fail with cryptic "new row violates row-level security policy" errors even when INSERT policy exists.

**Why it happens:**
- PostgreSQL needs to SELECT newly inserted rows to return them to the client
- RETURNING clause requires SELECT permission
- Developers assume INSERT policy is sufficient

**Consequences:**
- Inserts fail mysteriously
- Hours of debugging "why doesn't my INSERT work"
- Workarounds that disable security

**Prevention:**
- ALWAYS create SELECT policy alongside INSERT policy
- Use combined policy for simplicity:
  ```sql
  CREATE POLICY "tenant_all_access" ON [table]
    FOR ALL TO authenticated
    USING (tenant_id = auth.tenant_id())
    WITH CHECK (tenant_id = auth.tenant_id());
  ```

**Detection (Warning Signs):**
- Error: "new row violates row-level security policy"
- INSERT works from admin but not from application
- Tables with INSERT policy but no SELECT policy

**Phase to Address:** Phase 1 (Database Schema) - Use combined policies

---

## Moderate Pitfalls

Mistakes that cause performance issues, delays, or technical debt.

---

### Pitfall S8: RLS Performance Degradation on Large Tables

**What goes wrong:** RLS policies cause queries to slow dramatically as data grows. What worked with 1,000 rows becomes unusable with 100,000 rows.

**Why it happens:**
- RLS is evaluated per-row for every query
- Functions like `auth.uid()` called repeatedly
- Missing indexes on columns used in policies
- Complex joins in policy definitions

**Consequences:**
- Query times balloon from milliseconds to seconds
- Database connection exhaustion
- Application timeouts
- Expensive scaling to compensate

**Prevention:**
1. **Index policy columns:**
   ```sql
   CREATE INDEX idx_tablename_tenant_id ON tablename(tenant_id);
   ```

2. **Wrap functions in SELECT:**
   ```sql
   -- BAD: Called per row
   USING (auth.uid() = user_id)
   -- GOOD: Cached per statement
   USING ((SELECT auth.uid()) = user_id)
   ```

3. **Optimize JOIN direction:**
   ```sql
   -- BAD: Scans per row
   USING (auth.uid() IN (SELECT user_id FROM team_users WHERE team_id = table.team_id))
   -- GOOD: Fixed filter first
   USING (team_id IN (SELECT team_id FROM team_users WHERE user_id = (SELECT auth.uid())))
   ```

4. **Add client-side filters that match RLS:**
   ```typescript
   // Even though RLS enforces this, add it for query optimization
   supabase.from('risks').select().eq('tenant_id', user.tenant_id)
   ```

**Detection (Warning Signs):**
- Queries slowing as data grows
- `EXPLAIN ANALYZE` showing sequential scans
- High database CPU with relatively few requests

**Phase to Address:** Phase 1 (Database Schema) - Build performance patterns from start

**Sources:**
- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)

---

### Pitfall S9: UPDATE Policy Missing WITH CHECK Clause

**What goes wrong:** UPDATE policy only has USING clause. Users can modify rows to values that would make them inaccessible or violate security rules.

**Why it happens:**
- USING clause is required, WITH CHECK is "optional"
- Not understanding that updates create new data states
- Copy-paste from SELECT policies

**Consequences:**
- Users can "steal" rows by changing tenant_id to their own
- Data can be modified to orphan state
- Security policy circumvention

**Prevention:**
- ALWAYS use both clauses for UPDATE:
  ```sql
  CREATE POLICY "tenant_update" ON [table]
    FOR UPDATE TO authenticated
    USING (tenant_id = auth.tenant_id())         -- Can only update rows you own
    WITH CHECK (tenant_id = auth.tenant_id());   -- Can only set values you're allowed
  ```

**Detection (Warning Signs):**
- UPDATE policies with only USING clause
- Ability to change tenant_id or owner fields
- Data appearing in wrong tenant contexts

**Phase to Address:** Phase 1 (Database Schema)

---

### Pitfall S10: pg_cron Jobs with Hardcoded Production URLs

**What goes wrong:** Cron jobs are created with hardcoded URLs and API keys. Jobs fail after key rotation or don't work in local/staging environments.

**Why it happens:**
- Quick setup during development
- Not considering environment differences
- Migrations include hardcoded values

**Consequences:**
- Jobs break silently after key rotation
- Cannot test cron jobs locally
- Staging and production interference

**Prevention:**
- Store secrets in Supabase Vault:
  ```sql
  -- Store in Vault
  SELECT vault.create_secret('edge_function_url', 'https://...');
  SELECT vault.create_secret('service_key', 'sbp_...');

  -- Access in cron job
  SELECT net.http_post(
    (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'edge_function_url'),
    ...
  );
  ```
- Use environment-specific configuration
- Document key rotation procedure

**Detection (Warning Signs):**
- Hardcoded URLs in migration files
- Cron jobs failing after key rotation
- Different behavior local vs production

**Phase to Address:** Phase 5 (Scheduled Jobs)

**Sources:**
- [Supabase pg_cron Debugging Guide](https://supabase.com/docs/guides/troubleshooting/pgcron-debugging-guide-n1KTaz)

---

### Pitfall S11: pg_cron Concurrent Job Overload

**What goes wrong:** Too many cron jobs run simultaneously, exhausting database connections and causing job failures.

**Why it happens:**
- All jobs scheduled at convenient times (:00, :30)
- Not considering job execution duration
- pg_cron limited to 32 concurrent jobs (8 recommended)

**Consequences:**
- Jobs fail silently
- Database connection exhaustion
- Application queries timeout during job execution

**Prevention:**
- Stagger job schedules (e.g., 0, 5, 10, 15 minutes)
- Limit concurrent jobs to 8 or fewer
- Keep individual jobs under 10 minutes
- Monitor `cron.job_run_details` table
- Use Vercel cron for lightweight jobs, pg_cron for database-heavy operations

**Detection (Warning Signs):**
- Jobs showing timeout errors in `cron.job_run_details`
- Application slowdowns at specific times
- "pg_cron scheduler process" not running (check worker status)

**Phase to Address:** Phase 5 (Scheduled Jobs)

---

### Pitfall S12: Database Migration Rollback Impossibility

**What goes wrong:** A migration is deployed to production and something goes wrong. There's no way to roll back.

**Why it happens:**
- Supabase CLI doesn't natively support rollback migrations
- No "down" migrations written
- Assumption that "it works in staging" means safe

**Consequences:**
- Manual emergency fixes in production
- Data loss during recovery attempts
- Extended downtime

**Prevention:**
- Write rollback SQL for every migration (even if not used by CLI)
- Use `supabase migration repair --status reverted` for removing migrations
- Test rollbacks in staging before production
- Take database backup before any migration:
  ```bash
  pg_dump -h db.xxx.supabase.co -U postgres > backup_$(date +%Y%m%d).sql
  ```
- Consider using node-pg-migrate for down migration support

**Detection (Warning Signs):**
- Migrations without corresponding rollback scripts
- No backup taken before migration
- Migrations not tested in staging first

**Phase to Address:** Phase 1 (Database Schema) - Establish migration patterns early

**Sources:**
- [Supabase Database Migrations](https://supabase.com/docs/guides/deployment/database-migrations)

---

### Pitfall S13: Connection Pool Exhaustion

**What goes wrong:** Application gets "Max client connections reached" errors during peak usage.

**Why it happens:**
- Using direct connections instead of pooled connections
- Running both PgBouncer and Supavisor with combined limits
- Long-running queries holding connections
- Serverless cold starts creating new connections

**Consequences:**
- Application errors during traffic spikes
- Database unresponsive
- User-facing failures

**Prevention:**
- Use connection pooler (port 6543) not direct connection (port 5432)
- For Vercel: Use pooled connection string:
  ```
  postgres://postgres.xxx:password@aws-0-region.pooler.supabase.com:6543/postgres
  ```
- Configure pool size based on usage (40% for API-heavy, 80% for direct)
- Add connection timeout and retry logic
- Use dedicated pooler if IPv6 available

**Detection (Warning Signs):**
- "Max client connections reached" errors
- Supavisor connection graph continuously growing
- Connection count not decreasing after traffic drops

**Phase to Address:** Phase 2 (Connection Setup) - Configure pooling correctly from start

**Sources:**
- [Supabase Connection Management](https://supabase.com/docs/guides/database/connection-management)

---

### Pitfall S14: Realtime Subscription Memory Leaks

**What goes wrong:** Realtime subscriptions accumulate, causing duplicate events and memory leaks.

**Why it happens:**
- Not cleaning up subscriptions when components unmount
- Creating new channels without removing old ones
- Non-unique channel names
- Uncleaned timers in retry logic

**Consequences:**
- Duplicate event handlers
- Memory growth over time
- Race conditions in event handling
- Connection limits reached

**Prevention:**
- Always clean up subscriptions:
  ```typescript
  useEffect(() => {
    const channel = supabase.channel('risks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'risks' }, handler)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  ```
- Use unique channel names
- Implement single active channel pattern
- Add subscription state management

**Detection (Warning Signs):**
- "Channel is Already Subscribed" errors
- Duplicate event callbacks
- Growing memory usage in browser
- Multiple connections in Supabase dashboard

**Phase to Address:** Phase 4 (Frontend Integration)

**Sources:**
- [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting)

---

### Pitfall S15: Resend Email Domain Reputation Issues

**What goes wrong:** Emails start going to spam or being rejected after initial success.

**Why it happens:**
- Using main domain for transactional email
- Missing SPF/DKIM/DMARC records
- No unsubscribe links in marketing-style emails
- High bounce rates from invalid addresses

**Consequences:**
- Critical notifications not delivered
- User signup flow broken
- Domain reputation damaged

**Prevention:**
- Use subdomain: `updates.riskguard.com` or `mail.riskguard.com`
- Configure DNS records properly (SPF, DKIM, DMARC)
- Monitor Resend Deliverability Insights
- Verify email addresses before storing
- Use `sending_access` only API keys (least privilege)
- Create domain-specific API keys

**Detection (Warning Signs):**
- Increased "Complained" status in Resend dashboard
- "Bounced" rates above 2%
- "Delivery Delayed" becoming common
- Users reporting missing emails

**Phase to Address:** Phase 3 (Email Integration)

**Sources:**
- [Resend Documentation](https://resend.com/)

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

---

### Pitfall S16: JWT Freshness Issues After Metadata Changes

**What goes wrong:** User permissions are changed in `app_metadata` but old permissions persist until JWT refreshes.

**Why it happens:**
- JWTs are valid until expiration
- Metadata changes don't invalidate existing tokens
- Default JWT lifetime can be long (1 hour+)

**Consequences:**
- Permission changes don't take effect immediately
- Users confused about access changes
- Security gap during transition

**Prevention:**
- Force token refresh after permission changes
- Use shorter JWT expiration (15-30 minutes)
- Implement server-side permission checks for sensitive operations
- Notify users to re-login for permission changes

**Detection (Warning Signs):**
- Users reporting "old" permissions working
- Permission changes taking time to apply
- Inconsistent access behavior

**Phase to Address:** Phase 2 (Auth Setup)

---

### Pitfall S17: Missing Rate Limiting on Auth Endpoints

**What goes wrong:** Attackers brute-force passwords or flood signup endpoints.

**Why it happens:**
- Assuming Supabase handles all rate limiting
- Not configuring CAPTCHA
- Not setting appropriate OTP expiry

**Consequences:**
- Account compromise through brute force
- Resource exhaustion from signup floods
- Email quota exhaustion

**Prevention:**
- Enable CAPTCHA on signup, signin, password reset
- Set OTP expiry to 1 hour or less (3600 seconds)
- Increase OTP length for higher entropy
- Enable leaked password protection (Pro plan+)
- Monitor auth logs for anomalies

**Detection (Warning Signs):**
- High volume of failed login attempts
- Rapid OTP requests
- Email sending quota exceeded

**Phase to Address:** Phase 2 (Auth Setup)

**Sources:**
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)

---

### Pitfall S18: Improper NULL Handling in RLS Policies

**What goes wrong:** Unauthenticated requests don't fail properly because `auth.uid() = user_id` returns FALSE (not error) when auth.uid() is NULL.

**Why it happens:**
- SQL NULL comparisons always return FALSE, not error
- Policy appears to "work" but doesn't explicitly reject
- Security through obscurity rather than explicit denial

**Consequences:**
- Subtle security issues
- Difficulty debugging access problems
- Potential edge case vulnerabilities

**Prevention:**
- Always check for NULL explicitly:
  ```sql
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  ```
- Or use tenant-based policies that inherently require authentication

**Detection (Warning Signs):**
- Policies without NULL checks
- Unauthenticated access attempts not logged
- Security testing not covering unauthenticated cases

**Phase to Address:** Phase 1 (Database Schema)

**Sources:**
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)

---

### Pitfall S19: Environment Variable Exposure in Vercel

**What goes wrong:** Sensitive keys end up in client-side bundles or git history.

**Why it happens:**
- Using `NEXT_PUBLIC_` prefix on sensitive variables
- Committing `.env` files
- Not separating server vs client environment variables

**Consequences:**
- API keys exposed in browser dev tools
- Secrets in git history
- Compliance violations

**Prevention:**
- Server-only vars: `SUPABASE_SERVICE_ROLE_KEY` (no prefix)
- Client vars: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe, protected by RLS)
- Add `.env*` to `.gitignore`
- Use Vercel environment variable UI, not files
- Audit environment variables before each deployment

**Detection (Warning Signs):**
- `service_role` or sensitive keys in browser network tab
- `.env` files in git history
- Environment variables with wrong prefix

**Phase to Address:** Phase 2 (Deployment Setup)

**Sources:**
- [Supabase Environment Variables](https://supabase.com/docs/guides/functions/secrets)

---

### Pitfall S20: Missing Monitoring and Alerting

**What goes wrong:** Production issues go unnoticed until users report them.

**Why it happens:**
- Assuming "it just works" after deployment
- Not setting up observability early
- Relying only on error logs

**Consequences:**
- Extended outages
- Slow performance undetected
- Security incidents missed

**Prevention:**
- Enable Supabase Reports dashboard
- Set up Prometheus/Grafana for custom metrics
- Configure alerts for:
  - 5xx error rates
  - Disk space < 10%
  - Connection pool exhaustion
  - Slow queries > 1s
- Subscribe to Supabase Status Page
- Set up error tracking (Sentry or similar)

**Detection (Warning Signs):**
- No monitoring dashboard configured
- No alerts set up
- Learning about issues from users

**Phase to Address:** Phase 6 (Production Hardening)

**Sources:**
- [Supabase Observability Features](https://supabase.com/blog/new-observability-features-in-supabase)

---

## V2.0 Phase-Specific Warnings

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| Phase 1 | Database Schema | RLS disabled on tables (S1) | Enable RLS + policy in same migration |
| Phase 1 | Database Schema | tenant_id confusion (S6) | Use app_metadata pattern consistently |
| Phase 1 | Database Schema | Performance (S8) | Index + function wrapping from start |
| Phase 2 | Auth Setup | service_role exposure (S3) | Strict env var patterns |
| Phase 2 | Auth Setup | JWT claims (S4) | Only use app_metadata |
| Phase 3 | Email | Domain reputation (S15) | Use subdomain, configure DNS |
| Phase 4 | Frontend | Realtime leaks (S14) | Cleanup pattern in every subscription |
| Phase 5 | Scheduled Jobs | Hardcoded URLs (S10) | Use Vault for secrets |
| Phase 5 | Scheduled Jobs | Concurrent overload (S11) | Stagger schedules, limit to 8 |
| Phase 6 | Production | No monitoring (S20) | Set up dashboards + alerts |

---

## Enterprise-Specific Considerations

For Holland Casino and similar enterprise clients:

1. **Compliance Requirements:**
   - Enable MFA for all Supabase admin accounts
   - Enable SSL Enforcement
   - Enable Network Restrictions
   - Consider Team/Enterprise plan for SOC 2 compliance
   - Document all RLS policies for audit

2. **Security Hardening:**
   - Use Security Advisor regularly
   - Enable leaked password protection
   - Set short OTP expiry (1 hour max)
   - Implement custom audit logging
   - Regular security testing of RLS policies

3. **High Availability:**
   - Enable Point in Time Recovery (PITR)
   - Set up read replicas if needed
   - Plan for 2-week notice to Supabase for high load events
   - Document incident response procedures

---

## V2.0 Sources Summary

### Official Documentation (HIGH confidence)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Production Checklist](https://supabase.com/docs/guides/deployment/going-into-prod)
- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv)
- [Supabase pg_cron Guide](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [Supabase Connection Management](https://supabase.com/docs/guides/database/connection-management)
- [Supabase Realtime Troubleshooting](https://supabase.com/docs/guides/realtime/troubleshooting)

### Security Research (MEDIUM confidence)
- [Supabase Security Flaw Report](https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/)
- [Supabase Security 2025 Retro](https://supabase.com/blog/supabase-security-2025-retro)

### Community Best Practices (MEDIUM confidence)
- [Leanware Supabase Best Practices](https://www.leanware.co/insights/supabase-best-practices)
- [Multi-Tenant RLS Patterns](https://www.antstack.com/blog/multi-tenant-applications-with-rls-on-supabase-postgress/)

---

*Pitfalls research for: RiskGuard ERM - Enterprise Risk Management Web Application*
*v1.0 Researched: 2026-01-19*
*v2.0 Researched: 2026-01-24*
