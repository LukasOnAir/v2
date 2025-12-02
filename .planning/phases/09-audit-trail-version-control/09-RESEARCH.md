# Phase 9: Audit Trail & Version Control - Research

**Researched:** 2026-01-21
**Domain:** Change tracking, audit logging, state history in Zustand + LocalStorage applications
**Confidence:** HIGH

## Summary

Phase 9 implements a comprehensive audit trail system that tracks all data changes across the application. The system must capture who changed what and when for risks, processes, controls, and RCT rows.

The standard approach for Zustand applications is a **custom middleware pattern** that intercepts all state changes, computes diffs between old and new state, and logs entries to a separate audit store. For this LocalStorage-based application, the audit log can be stored in its own persisted store with size management to prevent hitting the 5MB localStorage limit.

The UI for viewing change history will use a **vertical timeline pattern** displaying chronological changes with before/after values. Given the existing TanStack Table usage, filtering capabilities can be implemented using familiar patterns (date range, entity type, change type filters).

**Primary recommendation:** Create a Zustand audit middleware that wraps existing stores, captures state diffs using deep-object-diff, and persists to a dedicated auditStore with automatic pruning to manage size.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zustand | 5.0.10 | Already in use | Supports custom middleware for change interception |
| deep-object-diff | 1.1.9 | Diff computation | Most comprehensive diff functions (detailedDiff) |
| date-fns | 4.1.0 | Already in use | Timestamp formatting and filtering |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| subscribeWithSelector | (builtin) | Change detection | Track specific state slices with previous values |
| nanoid | (already used) | ID generation | Generate unique audit entry IDs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| deep-object-diff | microdiff | Faster (252k vs 121k ops/sec) but doesn't provide old values in detailed diff |
| localStorage | IndexedDB via Dexie | Better for large datasets (no 5MB limit) but adds complexity for MVP |
| Custom middleware | zustand-logger-middleware | Pre-built but requires specific store structure |

**Installation:**
```bash
npm install deep-object-diff
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── stores/
│   ├── auditStore.ts       # Audit log storage and queries
│   └── middleware/
│       └── auditMiddleware.ts  # Intercepts changes, computes diffs
├── types/
│   └── audit.ts            # AuditEntry, ChangeType, EntityType types
├── components/
│   └── audit/
│       ├── AuditTimeline.tsx    # Vertical timeline of changes
│       ├── AuditFilters.tsx     # Date range, entity, change type filters
│       ├── ChangeDetail.tsx     # Before/after comparison view
│       └── EntityHistory.tsx    # History panel for specific entity
└── hooks/
    └── useAuditLog.ts      # Filtered queries on audit store
```

### Pattern 1: Audit Middleware
**What:** A higher-order function that wraps the store creator, intercepts `set` calls, computes diffs, and logs to auditStore
**When to use:** For comprehensive change tracking across all mutations
**Example:**
```typescript
// Source: Zustand middleware documentation pattern
import { StateCreator, StoreMutatorIdentifier } from 'zustand'
import { detailedDiff } from 'deep-object-diff'
import { useAuditStore } from './auditStore'

type AuditMiddleware = <
  T,
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  f: StateCreator<T, Mps, Mcs>,
  entityType: EntityType
) => StateCreator<T, Mps, Mcs>

const auditMiddleware: AuditMiddleware = (config, entityType) => (set, get, api) => {
  return config(
    (...args) => {
      const prevState = get()
      set(...args)
      const nextState = get()

      // Compute diff and log if meaningful changes
      const diff = detailedDiff(prevState, nextState)
      if (hasChanges(diff)) {
        useAuditStore.getState().addEntry({
          timestamp: new Date().toISOString(),
          entityType,
          changeType: inferChangeType(diff),
          before: extractRelevant(prevState, diff),
          after: extractRelevant(nextState, diff),
          user: getCurrentUser(), // from uiStore
        })
      }
    },
    get,
    api
  )
}
```

### Pattern 2: Audit Entry Data Model
**What:** Structured format for audit log entries
**When to use:** Storing and querying change history
**Example:**
```typescript
// Source: Generic audit log table design pattern
interface AuditEntry {
  id: string                    // nanoid
  timestamp: string             // ISO 8601
  entityType: EntityType        // 'risk' | 'process' | 'control' | 'rctRow' | 'customColumn'
  entityId: string              // UUID of changed entity
  entityName?: string           // Human-readable name for display
  changeType: ChangeType        // 'create' | 'update' | 'delete'
  fieldChanges: FieldChange[]   // Array of individual field changes
  user: string                  // 'risk-manager' | 'control-owner'
}

interface FieldChange {
  field: string                 // Field path (e.g., 'grossProbability', 'controls[0].netScore')
  oldValue: unknown            // Value before change
  newValue: unknown            // Value after change
}
```

### Pattern 3: Timeline UI Component
**What:** Vertical timeline showing chronological changes with expandable details
**When to use:** Displaying audit history in UI
**Example:**
```typescript
// Source: react-vertical-timeline-component pattern adapted for Tailwind
interface TimelineEvent {
  id: string
  date: Date
  title: string
  description: string
  icon: ReactNode
  changes?: FieldChange[]
}

function AuditTimeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="relative border-l border-zinc-700 pl-6 space-y-8">
      {events.map((event) => (
        <div key={event.id} className="relative">
          <div className="absolute -left-9 w-4 h-4 rounded-full bg-amber-500" />
          <time className="text-xs text-zinc-500">{format(event.date, 'PPpp')}</time>
          <h3 className="text-sm font-medium text-zinc-200">{event.title}</h3>
          <p className="text-sm text-zinc-400">{event.description}</p>
          {event.changes && <ChangeDetail changes={event.changes} />}
        </div>
      ))}
    </div>
  )
}
```

### Pattern 4: Size-Managed Audit Store
**What:** Audit store with automatic pruning to prevent localStorage overflow
**When to use:** When storing potentially unbounded audit logs in localStorage
**Example:**
```typescript
// Source: localStorage size management pattern
const MAX_AUDIT_ENTRIES = 10000  // ~500KB estimated at ~50 bytes/entry
const PRUNE_AMOUNT = 1000        // Remove oldest when limit reached

interface AuditState {
  entries: AuditEntry[]
  addEntry: (entry: Omit<AuditEntry, 'id'>) => void
  getEntriesForEntity: (entityId: string) => AuditEntry[]
  getEntriesByDateRange: (start: Date, end: Date) => AuditEntry[]
  pruneOldEntries: () => void
}

export const useAuditStore = create<AuditState>()(
  persist(
    immer((set, get) => ({
      entries: [],

      addEntry: (entry) => set((state) => {
        state.entries.push({ ...entry, id: nanoid() })
        // Auto-prune if exceeding limit
        if (state.entries.length > MAX_AUDIT_ENTRIES) {
          state.entries = state.entries.slice(PRUNE_AMOUNT)
        }
      }),

      // Query methods...
    })),
    {
      name: 'riskguard-audit',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

### Anti-Patterns to Avoid
- **Logging inside immer producers:** Accessing get() inside immer set() returns draft state; capture before state before calling set()
- **Logging all fields:** Only log changed fields, not entire state snapshots
- **Synchronous diff on large state:** For large datasets, consider debouncing or batching audit entries
- **No size management:** LocalStorage has 5MB limit; unbounded audit logs will crash the app

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Object comparison | Custom deep equality | deep-object-diff detailedDiff() | Handles arrays, nested objects, edge cases |
| Previous state tracking | Manual copy before set | Zustand subscribeWithSelector | Built-in previous value access |
| Timestamp formatting | Manual date strings | date-fns format() | Already in use, handles timezone, i18n |
| Unique IDs | Math.random() | nanoid | Already in use, collision-safe |
| Timeline UI | Custom div/flexbox layout | Tailwind CSS pattern | Project already uses Tailwind, keep consistent |

**Key insight:** The complexity in audit trails is in change detection logic, not the UI. Use proven diff libraries rather than building custom comparison code.

## Common Pitfalls

### Pitfall 1: Logging Draft State in Immer
**What goes wrong:** Reading state inside immer's set() returns Proxy (draft), not actual values
**Why it happens:** Immer creates a mutable draft that looks like real state
**How to avoid:** Capture prevState = get() BEFORE calling set()
**Warning signs:** Audit entries show [object Proxy] or undefined values

### Pitfall 2: Circular Reference in Diff
**What goes wrong:** JSON.stringify fails or deep-object-diff hangs
**Why it happens:** React components or DOM refs accidentally stored in state
**How to avoid:** Never store React components in Zustand state; use IDs/references
**Warning signs:** Maximum call stack exceeded errors

### Pitfall 3: localStorage Quota Exceeded
**What goes wrong:** DOMException: QuotaExceededError when persisting
**Why it happens:** Audit log grows unbounded, exceeds 5MB limit
**How to avoid:** Implement MAX_ENTRIES limit with automatic pruning
**Warning signs:** App works initially, fails after extended use

### Pitfall 4: Performance Degradation with Large Logs
**What goes wrong:** UI freezes when viewing audit history
**Why it happens:** Rendering thousands of audit entries without virtualization
**How to avoid:** Use pagination or virtual scrolling for audit list; limit display to recent N entries
**Warning signs:** Audit page takes seconds to load

### Pitfall 5: Logging Sensitive Computed Fields
**What goes wrong:** Audit shows redundant changes (grossScore changes when grossProbability changes)
**Why it happens:** Logging derived/computed fields that change automatically
**How to avoid:** Filter out computed fields from diff (grossScore, netScore, withinAppetite)
**Warning signs:** Every change shows multiple redundant field changes

### Pitfall 6: Losing Audit Data on Schema Migration
**What goes wrong:** Old audit entries become unreadable after type changes
**Why it happens:** Audit entries reference old field names or structures
**How to avoid:** Version audit entries; consider forward-compatible field naming
**Warning signs:** Old history displays as "unknown change" or errors

## Code Examples

Verified patterns from official sources:

### Custom Log Middleware (Zustand Pattern)
```typescript
// Source: https://github.com/pmndrs/zustand/discussions/788
const log = (config) => (set, get, api) => {
  const patchedSet = (...args) => {
    const prevState = get()
    set(...args)
    const nextState = get()
    console.log('prev state', prevState)
    console.log('next state', nextState)
  }
  api.setState = patchedSet
  return config(patchedSet, get, api)
}
```

### subscribeWithSelector for Previous Values
```typescript
// Source: https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector
import { subscribeWithSelector } from 'zustand/middleware'

const useDogStore = create(
  subscribeWithSelector(() => ({ paw: true, snout: true, fur: true })),
)

// Subscribe exposes the previous value
const unsub = useDogStore.subscribe(
  (state) => state.paw,
  (paw, previousPaw) => console.log(paw, previousPaw),
)
```

### detailedDiff Usage
```typescript
// Source: https://github.com/mattphillips/deep-object-diff
import { detailedDiff } from 'deep-object-diff'

const lhs = { foo: { bar: { a: ['a', 'b'], e: 100 } }, buzz: 'world' }
const rhs = { foo: { bar: { a: ['a'], d: 'Hello!' } }, buzz: 'fizz' }

const diff = detailedDiff(lhs, rhs)
// Result:
// {
//   added: { foo: { bar: { d: 'Hello!' } } },
//   deleted: { foo: { bar: { a: { '1': undefined }, e: undefined } } },
//   updated: { buzz: 'fizz' }
// }
```

### Persisted Store with Size Management
```typescript
// Source: Zustand persist documentation + localStorage best practices
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

const MAX_ENTRIES = 10000

export const useAuditStore = create(
  persist(
    immer((set) => ({
      entries: [],
      addEntry: (entry) => set((state) => {
        state.entries.push(entry)
        if (state.entries.length > MAX_ENTRIES) {
          state.entries = state.entries.slice(1000) // Keep most recent
        }
      }),
    })),
    {
      name: 'riskguard-audit',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Redux action logging | Zustand middleware | 2022-2023 | Simpler, less boilerplate |
| Shadow tables per entity | Generic audit table | Standard practice | Single audit store for all entities |
| Full state snapshots | Field-level diffs | Performance necessity | Smaller storage, faster UI |
| LocalStorage only | IndexedDB for large data | 2023+ | Overcomes 5MB limit |

**Deprecated/outdated:**
- zustand-logger-middleware: Requires specific store structure (actions in `action` object)
- object-diff: Deprecated on npm, use deep-object-diff instead

## Open Questions

Things that couldn't be fully resolved:

1. **Entity Name Resolution**
   - What we know: Audit entries should show human-readable names, not just UUIDs
   - What's unclear: Should names be captured at change time (historical accuracy) or resolved at display time (current names)?
   - Recommendation: Capture entityName at change time for historical accuracy; accept that renamed entities show old names in history

2. **IndexedDB Migration Path**
   - What we know: localStorage has 5MB limit; heavy audit logging could exceed this
   - What's unclear: When to switch from localStorage to IndexedDB
   - Recommendation: Start with localStorage + pruning (10k entries max); monitor actual usage; IndexedDB is v2 scope

3. **Audit for Bulk Operations**
   - What we know: Taxonomy deletions cascade; RCT regeneration affects many rows
   - What's unclear: How to log bulk changes (one entry per row vs. summary entry?)
   - Recommendation: Single summary entry for bulk operations (e.g., "Deleted risk '1.1' and 5 child items")

## Sources

### Primary (HIGH confidence)
- [Zustand GitHub - Middleware documentation](https://github.com/pmndrs/zustand) - Custom middleware patterns
- [Zustand subscribeWithSelector](https://zustand.docs.pmnd.rs/middlewares/subscribe-with-selector) - Previous value tracking
- [deep-object-diff GitHub](https://github.com/mattphillips/deep-object-diff) - Diff API documentation

### Secondary (MEDIUM confidence)
- [Zustand Discussion #788](https://github.com/pmndrs/zustand/discussions/788) - Log middleware implementation
- [Vertabelo - Database Design for Audit Logging](https://vertabelo.com/blog/database-design-for-audit-logging/) - Generic audit table pattern
- [LogRocket - Dexie.js for React](https://blog.logrocket.com/dexie-js-indexeddb-react-apps-offline-data-storage/) - IndexedDB alternative
- [MDN - Storage quotas](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) - 5MB localStorage limit

### Tertiary (LOW confidence)
- [Medium - 4 Common Designs of Audit Trail](https://medium.com/techtofreedom/4-common-designs-of-audit-trail-tracking-data-changes-in-databases-c894b7bb6d18) - Schema patterns
- [Flowbite React Timeline](https://flowbite-react.com/docs/components/timeline) - Timeline UI pattern for Tailwind

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries verified via npm, Zustand patterns from official docs
- Architecture: HIGH - Middleware pattern documented, diff library API verified
- Pitfalls: MEDIUM - Based on general Zustand + Immer patterns, not audit-specific testing
- UI patterns: MEDIUM - Timeline patterns common but need adaptation for audit context

**Research date:** 2026-01-21
**Valid until:** 2026-02-21 (30 days - stable domain, no fast-moving dependencies)
