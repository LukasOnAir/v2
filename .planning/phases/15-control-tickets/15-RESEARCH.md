# Phase 15: Control Tickets - Research

**Researched:** 2026-01-23
**Domain:** Task management, Kanban boards, recurring tasks, control maintenance workflows
**Confidence:** HIGH

## Summary

Phase 15 implements a ticket system for control-related tasks such as maintenance, periodic reviews, and updates. This is distinct from remediation (Phase 8) which tracks test findings - tickets are proactive task management for controls. The phase introduces a Kanban board as the primary view with drag-and-drop status changes, ticket recurrence for periodic tasks, and many-to-many control relationships.

The codebase already has @dnd-kit/sortable v10 installed and used in ColumnManager for list reordering. Extending this to Kanban-style multi-container drag requires additional patterns from @dnd-kit/core: multiple SortableContexts, collision detection for cross-column drops, and DragOverlay for visual feedback. The existing remediation infrastructure provides excellent templates for ticket data structures, status workflows, priority badges, and dashboard statistics.

The ticket system will use a separate store (ticketsStore) to maintain clean separation from remediation data, following the pattern established by controlsStore for first-class entities. Tickets link to controls via a junction table pattern (TicketControlLink) enabling many-to-many relationships, consistent with the existing ControlLink pattern.

**Primary recommendation:** Create a `Ticket` type with category, status, priority, recurrence fields and a `TicketControlLink` junction for many-to-many control relationships. Build a dedicated ticketsStore following controlsStore patterns. Implement Kanban board using @dnd-kit with multiple SortableContexts per column and DragOverlay for cross-column drag feedback.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | ^6.3.1 | Drag-and-drop context | Already used for ColumnManager |
| @dnd-kit/sortable | ^10.0.0 | Sortable lists | Already used for ColumnManager |
| @dnd-kit/utilities | ^3.2.2 | CSS transform utilities | Already installed |
| date-fns | ^4.1.0 | Date calculations, recurrence | Already used throughout |
| Zustand + Immer | ^5.0.10 | State management | Already used for all stores |
| lucide-react | ^0.562.0 | Icons | Already used throughout |
| react-router | ^7.12.0 | Routing for tickets page | Already configured |
| Fuse.js | ^7.1.0 | Fuzzy search | Already used for controls |
| nanoid | (bundled) | Unique IDs | Already used for entities |

### No New Libraries Needed
This phase builds entirely on existing infrastructure. The @dnd-kit packages already installed support Kanban-style multi-container drag.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit Kanban | react-beautiful-dnd | react-beautiful-dnd is unmaintained; @dnd-kit is actively developed and already in project |
| Separate ticketsStore | Extend rctStore | Separate store provides cleaner separation and avoids bloating rctStore further |
| Simple recurrence (enum) | iCalendar RRULE | RRULE is powerful but overkill; simple enum (monthly/quarterly/annually) suffices |
| Junction table for controls | Embedded controlIds array | Junction table matches existing ControlLink pattern and enables future per-link metadata |

**Installation:**
```bash
# No new packages needed
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  types/
    tickets.ts                    # NEW: Ticket, TicketStatus, TicketCategory, TicketControlLink types
  stores/
    ticketsStore.ts               # NEW: Ticket state management
  components/
    tickets/
      TicketsDashboard.tsx        # NEW: Main dashboard with stats header + Kanban board
      TicketsSummary.tsx          # NEW: Stats header (by status, priority, category, overdue)
      KanbanBoard.tsx             # NEW: Kanban board with drag-and-drop
      KanbanColumn.tsx            # NEW: Single status column
      TicketCard.tsx              # NEW: Draggable ticket card
      TicketForm.tsx              # NEW: Create/edit ticket modal
      TicketFilters.tsx           # NEW: Filter/sort controls
      ControlIndicator.tsx        # NEW: Badge showing ticket count + status on controls
    rct/
      ControlPanel.tsx            # EXTEND: Add TicketsSection for control-level access
      TicketsSection.tsx          # NEW: Collapsible section in ControlPanel
    controls/
      ControlsTable.tsx           # EXTEND: Add ticket indicator column
  pages/
    TicketsPage.tsx               # NEW: /tickets route
```

### Pattern 1: Ticket Type with Recurrence
**What:** Data structure for a control maintenance ticket with optional recurrence
**When to use:** Every ticket entity
**Example:**
```typescript
// Source: Prior decisions + GRC task management patterns
export type TicketStatus = 'todo' | 'in-progress' | 'review' | 'done'
export type TicketCategory = 'maintenance' | 'periodic-review' | 'update-change' | 'other'
export type TicketPriority = 'critical' | 'high' | 'medium' | 'low'
export type RecurrenceInterval = 'monthly' | 'quarterly' | 'annually' | 'custom'

export interface TicketRecurrence {
  interval: RecurrenceInterval
  customDays?: number            // For 'custom' interval
  nextDue: string                // ISO date string of next occurrence
}

export interface Ticket {
  id: string
  title: string
  description?: string
  category: TicketCategory
  status: TicketStatus
  priority: TicketPriority
  owner: string                   // Person responsible
  deadline: string                // ISO date string (yyyy-MM-dd)
  recurrence?: TicketRecurrence   // Optional repeating schedule
  createdDate: string             // When ticket was created
  doneDate?: string               // When status changed to done (for archiving)
  archived: boolean               // Whether ticket is archived
  notes?: string                  // Additional notes
}

// Many-to-many junction for ticket-to-control relationships
export interface TicketControlLink {
  id: string
  ticketId: string
  controlId: string
  createdAt: string
}
```

### Pattern 2: Kanban Multi-Container Drag with @dnd-kit
**What:** Handle drag-and-drop between Kanban columns for status changes
**When to use:** KanbanBoard component
**Example:**
```typescript
// Source: @dnd-kit multi-container patterns, LogRocket tutorial
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

function KanbanBoard() {
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null)
  const updateTicketStatus = useTicketsStore(s => s.updateTicketStatus)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }, // Prevent accidental drags
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const ticket = findTicketById(event.active.id as string)
    setActiveTicket(ticket)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTicket(null)

    if (!over) return

    const ticketId = active.id as string
    const targetStatus = over.id as TicketStatus // Column IDs are status values

    updateTicketStatus(ticketId, targetStatus)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto">
        {STATUSES.map(status => (
          <KanbanColumn key={status} status={status} tickets={ticketsByStatus[status]} />
        ))}
      </div>

      {/* Portal overlay for smooth cross-column drag */}
      <DragOverlay>
        {activeTicket && <TicketCard ticket={activeTicket} isDragging />}
      </DragOverlay>
    </DndContext>
  )
}
```

### Pattern 3: Kanban Column with SortableContext
**What:** Individual column containing draggable tickets
**When to use:** Each status column in the Kanban board
**Example:**
```typescript
// Source: @dnd-kit sortable patterns
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

function KanbanColumn({ status, tickets }: { status: TicketStatus; tickets: Ticket[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex-shrink-0 w-72 bg-surface-elevated rounded-lg p-3',
        isOver && 'ring-2 ring-accent-500'
      )}
    >
      <h3 className="font-medium text-text-primary mb-3">
        {STATUS_LABELS[status]} ({tickets.length})
      </h3>

      <SortableContext
        items={tickets.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2 min-h-[100px]">
          {tickets.map(ticket => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
        </div>
      </SortableContext>
    </div>
  )
}
```

### Pattern 4: Draggable Ticket Card with useSortable
**What:** Individual ticket card that can be dragged
**When to use:** Each ticket in a Kanban column
**Example:**
```typescript
// Source: @dnd-kit useSortable, existing ColumnManager pattern
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function TicketCard({ ticket, isDragging }: { ticket: Ticket; isDragging?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: ticket.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isOverdue = isBefore(parseISO(ticket.deadline), startOfDay(new Date())) &&
    ticket.status !== 'done'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={clsx(
        'p-3 bg-surface-overlay rounded-lg border cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50',
        isOverdue ? 'border-red-500' : 'border-surface-border'
      )}
    >
      <p className="text-sm text-text-primary font-medium truncate">{ticket.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <PriorityBadge priority={ticket.priority} />
        <span className="text-xs text-text-muted">{ticket.owner}</span>
      </div>
      <p className="text-xs text-text-muted mt-1">
        Due: {format(parseISO(ticket.deadline), 'MMM d')}
      </p>
    </div>
  )
}
```

### Pattern 5: Ticket Store with Auto-Archive
**What:** State management for tickets with auto-archive on done status
**When to use:** Managing all ticket operations
**Example:**
```typescript
// Source: Existing controlsStore/rctStore patterns
interface TicketsState {
  tickets: Ticket[]
  ticketControlLinks: TicketControlLink[]
  archivedTickets: Ticket[]  // Archived tickets stored separately
  archiveDaysAfterDone: number  // Default: 7 days

  // CRUD
  createTicket: (ticket: Omit<Ticket, 'id' | 'createdDate' | 'archived'>) => string
  updateTicket: (ticketId: string, updates: Partial<Ticket>) => void
  updateTicketStatus: (ticketId: string, status: TicketStatus) => void
  deleteTicket: (ticketId: string) => void

  // Links
  linkTicketToControl: (ticketId: string, controlId: string) => void
  unlinkTicketFromControl: (ticketId: string, controlId: string) => void
  getControlsForTicket: (ticketId: string) => string[]
  getTicketsForControl: (controlId: string) => Ticket[]

  // Queries
  getActiveTickets: () => Ticket[]
  getOverdueTickets: () => Ticket[]
  getUpcomingTickets: (days: number) => Ticket[]

  // Recurrence
  processRecurringTickets: () => void  // Called to generate new tickets from completed recurring ones
}

// Auto-archive implementation in updateTicketStatus
updateTicketStatus: (ticketId, status) => set((state) => {
  const ticket = state.tickets.find(t => t.id === ticketId)
  if (!ticket) return

  ticket.status = status
  if (status === 'done') {
    ticket.doneDate = format(new Date(), 'yyyy-MM-dd')
    // Schedule for archiving (actual archive happens on query or periodic check)
  }
})
```

### Pattern 6: Control Ticket Indicator
**What:** Badge showing ticket count and status color on controls
**When to use:** Controls Hub table and ControlPanel
**Example:**
```typescript
// Source: Existing badge patterns in codebase
function ControlTicketIndicator({ controlId }: { controlId: string }) {
  const tickets = useTicketsStore(s => s.getTicketsForControl(controlId))

  const activeTickets = tickets.filter(t => !t.archived && t.status !== 'done')
  const hasOverdue = activeTickets.some(t =>
    isBefore(parseISO(t.deadline), startOfDay(new Date()))
  )
  const hasHighPriority = activeTickets.some(t =>
    t.priority === 'critical' || t.priority === 'high'
  )

  if (activeTickets.length === 0) return null

  // Color logic: red if overdue, amber if high/critical priority, green otherwise
  const colorClass = hasOverdue
    ? 'bg-red-500/20 text-red-400'
    : hasHighPriority
    ? 'bg-amber-500/20 text-amber-400'
    : 'bg-green-500/20 text-green-400'

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded ${colorClass}`}>
      {activeTickets.length} {activeTickets.length === 1 ? 'ticket' : 'tickets'}
    </span>
  )
}
```

### Pattern 7: Recurrence Processing
**What:** Generate new ticket when recurring ticket is marked done
**When to use:** After status changes to done for recurring tickets
**Example:**
```typescript
// Source: date-fns patterns, recurring task patterns
function processRecurringTicket(ticket: Ticket): Ticket | null {
  if (!ticket.recurrence || ticket.status !== 'done') return null

  const { interval, customDays, nextDue } = ticket.recurrence
  let nextDeadline: Date

  switch (interval) {
    case 'monthly':
      nextDeadline = addMonths(parseISO(nextDue), 1)
      break
    case 'quarterly':
      nextDeadline = addMonths(parseISO(nextDue), 3)
      break
    case 'annually':
      nextDeadline = addYears(parseISO(nextDue), 1)
      break
    case 'custom':
      nextDeadline = addDays(parseISO(nextDue), customDays ?? 30)
      break
  }

  return {
    ...ticket,
    id: nanoid(),
    status: 'todo',
    deadline: format(nextDeadline, 'yyyy-MM-dd'),
    recurrence: {
      ...ticket.recurrence,
      nextDue: format(nextDeadline, 'yyyy-MM-dd'),
    },
    createdDate: format(new Date(), 'yyyy-MM-dd'),
    doneDate: undefined,
    archived: false,
  }
}
```

### Anti-Patterns to Avoid
- **Embedding tickets in controls:** Keep tickets as first-class entities with junction table for flexibility
- **Complex recurrence rules:** Simple interval enum is enough; don't over-engineer with iCalendar RRULE
- **Immediate archiving:** Archive after delay (7 days) to allow review of completed work
- **Mixing with remediation:** Tickets are proactive tasks; remediation is reactive to test findings - keep separate
- **Nested ticket hierarchies:** Flat ticket list is sufficient; subtasks add unnecessary complexity
- **Manual archive trigger:** Auto-archive done tickets to reduce maintenance burden

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cross-column drag | Custom drag events | @dnd-kit/core with closestCorners | Already in project, handles edge cases |
| Drag visual feedback | CSS hacks | @dnd-kit DragOverlay | Proper portal rendering, no layout shift |
| Deadline calculations | Manual date math | date-fns addMonths, addDays | Already in project, handles month boundaries |
| Overdue detection | Manual comparison | date-fns isBefore with startOfDay | Timezone-safe, consistent pattern |
| Unique IDs | Math.random | nanoid | Already used throughout codebase |
| Fuzzy search | Custom filter | Fuse.js | Already used for controls |

**Key insight:** The @dnd-kit packages already installed support full Kanban functionality. The key addition is using useDroppable for columns and closestCorners collision detection for multi-container scenarios.

## Common Pitfalls

### Pitfall 1: Drag-and-Drop Collision Detection
**What goes wrong:** Items don't drop into the correct column or get stuck
**Why it happens:** Using closestCenter instead of closestCorners for multi-container
**How to avoid:**
1. Use `closestCorners` collision detection for Kanban boards
2. Set column IDs to status values for easy mapping
3. Add activation constraint (distance: 8) to prevent accidental drags
**Warning signs:** Cards jumping to wrong columns, drops not registering

### Pitfall 2: Orphaned Ticket-Control Links
**What goes wrong:** Links point to deleted controls
**Why it happens:** No cascade delete when control is removed
**How to avoid:**
1. In controlsStore.removeControl, also remove ticketControlLinks for that control
2. Filter out orphaned links in getters as defensive measure
3. Add cleanup in ticketsStore initialization
**Warning signs:** Ticket shows linked to non-existent control

### Pitfall 3: Recurrence Duplication
**What goes wrong:** Multiple tickets generated for same recurrence period
**Why it happens:** Processing recurring ticket multiple times
**How to avoid:**
1. Mark original ticket with `recurrenceProcessed: true` after generating next
2. Only process on status change to 'done', not on every status update
3. Store `lastRecurrenceDate` to prevent duplicates
**Warning signs:** Duplicate recurring tickets appearing

### Pitfall 4: Archive Timing Issues
**What goes wrong:** Tickets disappear immediately or never archive
**Why it happens:** Checking archive eligibility incorrectly
**How to avoid:**
1. Store `doneDate` when status changes to done
2. Calculate archive eligibility: `doneDate + archiveDaysAfterDone < today`
3. Move to archivedTickets array, don't delete
4. Provide "view archived" option in UI
**Warning signs:** Users asking where their completed tickets went

### Pitfall 5: Stale Kanban State on Drag
**What goes wrong:** Visual state doesn't match actual state after drag
**Why it happens:** Not properly cleaning up activeTicket state
**How to avoid:**
1. Set activeTicket to null in both handleDragEnd and handleDragCancel
2. Use DragOverlay for visual feedback (decoupled from actual position)
3. Update store state synchronously in handleDragEnd
**Warning signs:** Ghost cards, cards in wrong position until refresh

### Pitfall 6: Category/Status Filter Confusion
**What goes wrong:** Filters don't work as expected
**Why it happens:** Mixing category and status filtering logic
**How to avoid:**
1. Category filter: which types of tickets to show
2. Status filter: which Kanban columns to show (usually show all)
3. Keep filters independent, apply sequentially
**Warning signs:** Filtering by category hides Kanban columns

## Code Examples

Verified patterns from existing codebase and official sources:

### Ticket Stats Summary (matching RemediationSummary pattern)
```typescript
// Source: Existing RemediationSummary.tsx
function useTicketsSummary() {
  const tickets = useTicketsStore(s => s.tickets.filter(t => !t.archived))

  return useMemo(() => {
    const byStatus: Record<TicketStatus, number> = {
      'todo': 0, 'in-progress': 0, 'review': 0, 'done': 0,
    }
    const byCategory: Record<TicketCategory, number> = {
      'maintenance': 0, 'periodic-review': 0, 'update-change': 0, 'other': 0,
    }
    const byPriority: Record<TicketPriority, number> = {
      'critical': 0, 'high': 0, 'medium': 0, 'low': 0,
    }

    const today = startOfDay(new Date())
    let overdueCount = 0

    for (const ticket of tickets) {
      byStatus[ticket.status]++
      byCategory[ticket.category]++
      if (ticket.status !== 'done') {
        byPriority[ticket.priority]++
        if (isBefore(parseISO(ticket.deadline), today)) {
          overdueCount++
        }
      }
    }

    return { byStatus, byCategory, byPriority, overdueCount, total: tickets.length }
  }, [tickets])
}
```

### Status and Priority Badges (matching existing patterns)
```typescript
// Source: Existing RemediationTable.tsx patterns
const STATUS_STYLES: Record<TicketStatus, string> = {
  'todo': 'bg-blue-500/20 text-blue-400',
  'in-progress': 'bg-amber-500/20 text-amber-400',
  'review': 'bg-purple-500/20 text-purple-400',
  'done': 'bg-green-500/20 text-green-400',
}

const PRIORITY_STYLES: Record<TicketPriority, string> = {
  'critical': 'bg-red-500/20 text-red-400',
  'high': 'bg-orange-500/20 text-orange-400',
  'medium': 'bg-amber-500/20 text-amber-400',
  'low': 'bg-green-500/20 text-green-400',
}

const CATEGORY_STYLES: Record<TicketCategory, string> = {
  'maintenance': 'bg-cyan-500/20 text-cyan-400',
  'periodic-review': 'bg-violet-500/20 text-violet-400',
  'update-change': 'bg-emerald-500/20 text-emerald-400',
  'other': 'bg-gray-500/20 text-gray-400',
}
```

### TicketsSection in ControlPanel (following ControlTestSection pattern)
```typescript
// Source: Existing ControlTestSection.tsx collapsible pattern
function TicketsSection({ controlId }: { controlId: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const tickets = useTicketsStore(s => s.getTicketsForControl(controlId))
  const activeTickets = tickets.filter(t => !t.archived && t.status !== 'done')

  return (
    <div className="mt-3 pt-3 border-t border-surface-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 w-full text-left"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Ticket size={16} className="text-text-muted" />
        <span className="text-sm font-medium text-text-primary">Tickets</span>
        {activeTickets.length > 0 && (
          <span className="text-xs text-text-muted">
            ({activeTickets.length} active)
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2 pl-6">
          {/* Ticket list and create button */}
        </div>
      )}
    </div>
  )
}
```

### Sidebar Navigation Entry
```typescript
// Source: Existing Sidebar.tsx pattern
// Add to navItems array:
{ to: '/tickets', icon: TicketIcon, label: 'Tickets' }
// Note: Use Ticket from lucide-react (or ClipboardCheck for variation)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Spreadsheet task tracking | Integrated Kanban boards | 2018+ | Visual workflow, real-time status |
| Manual recurring creation | Automated recurrence | 2019+ | Reduced administrative burden |
| Email reminders | In-app deadline tracking | 2020+ | Centralized visibility |
| List view only | Kanban + list hybrid | 2021+ | Multiple perspectives on same data |
| Separate ticket system | Integrated with controls | 2022+ | Context-aware task management |

**Deprecated/outdated:**
- **react-beautiful-dnd:** Unmaintained, no TypeScript updates, @dnd-kit is the successor
- **Complex workflow engines:** Simple status enum with drag-and-drop is sufficient for control maintenance
- **iCalendar RRULE:** Overkill for periodic reviews; simple interval enum suffices

## Open Questions

Things that couldn't be fully resolved:

1. **Archive period duration**
   - What we know: Done tickets should auto-archive after some period
   - What's unclear: 7 days vs 14 days vs 30 days
   - Recommendation: Default to 7 days (one week review period); make configurable if needed

2. **Custom category management**
   - What we know: 4 default categories with ability to add custom
   - What's unclear: Should users be able to edit/delete custom categories?
   - Recommendation: Allow add only initially; edit/delete adds complexity for minimal benefit

3. **Ticket assignment notifications**
   - What we know: Tickets have owner field
   - What's unclear: Should there be any notification when assigned?
   - Recommendation: Defer notifications; dashboard visibility is sufficient for demo

4. **Multi-control ticket display**
   - What we know: Tickets can span multiple controls
   - What's unclear: How to display in Kanban card when linked to many controls?
   - Recommendation: Show count badge ("3 controls"); expand in detail view

5. **Drag within columns for ordering**
   - What we know: @dnd-kit supports both within-column and cross-column sorting
   - What's unclear: Do users need manual ordering within status?
   - Recommendation: Support but don't persist; sort by deadline/priority by default

## Sources

### Primary (HIGH confidence)
- Existing codebase: ColumnManager.tsx (@dnd-kit patterns), RemediationSummary.tsx (stats pattern), controlsStore.ts (entity store pattern)
- [@dnd-kit documentation](https://docs.dndkit.com/) - Multi-container sorting, DragOverlay
- [date-fns documentation](https://date-fns.org/) - addMonths, addDays, date calculations

### Secondary (MEDIUM confidence)
- [LogRocket @dnd-kit Kanban Tutorial](https://blog.logrocket.com/build-kanban-board-dnd-kit-react/) - Component structure, collision detection
- [Radzion Kanban Blog](https://radzion.com/blog/kanban/) - DragOverlay pattern, TypeScript interfaces
- [Plaintext Engineering Kanban](https://plaintext-engineering.com/blog/drag-n-drop-kanban-board-react/) - Multi-container patterns

### Tertiary (LOW confidence)
- [react-dnd-kit-tailwind-shadcn-ui GitHub](https://github.com/Georgegriff/react-dnd-kit-tailwind-shadcn-ui) - Reference implementation (not directly verified)
- WebSearch results for recurring task patterns - general concepts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in project, proven patterns
- Architecture: HIGH - Extends established patterns from Phases 8, 13
- Kanban drag-drop: HIGH - @dnd-kit well-documented, patterns verified
- Recurrence: MEDIUM - Simple implementation based on date-fns, may need refinement
- Auto-archive: MEDIUM - Logic straightforward, timing needs user validation

**Research date:** 2026-01-23
**Valid until:** 2026-02-23 (30 days - stable domain, no library changes expected)
