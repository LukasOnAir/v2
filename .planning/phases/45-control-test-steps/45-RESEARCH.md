# Phase 45: Control Test Steps - Research

**Researched:** 2026-01-28
**Domain:** Structured Test Procedures, Dynamic Form Generation, JSONB Storage
**Confidence:** HIGH

## Summary

Phase 45 adds structured test steps to the existing control test workflow. Currently, controls have a free-text `test_procedure` field that testers see before recording results. This phase transforms that into an optional array of discrete steps, each with a configurable input type, allowing guided and repeatable testing.

**Key findings:**
1. **JSONB storage on controls table** - Add a `test_steps` JSONB column alongside existing `test_procedure` TEXT for backward compatibility
2. **Existing patterns to reuse** - dnd-kit sortable list (ColumnManager.tsx), JSONB array handling (remediation_plans.action_items), PhotoUpload component
3. **TestWizard already has step structure** - Current 4-step wizard (Review > Result > Evidence > Submit) can be extended with dynamic procedure steps between Review and Result
4. **Per-step evidence storage** - Store step responses in `control_tests.step_responses` JSONB column, including per-step photo URLs
5. **Input type components** - Use existing native HTML inputs styled with Tailwind; no new UI library needed

**Primary recommendation:** Add `test_steps` JSONB column to controls table and `step_responses` JSONB column to control_tests table. Create a TestStepsEditor component for Controls Hub, extend TestWizard to render dynamic steps, and update ControlPanel/ControlDetailPanel for read-only step display.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React + TypeScript | 19.0.0 | UI framework | Already used |
| Tailwind CSS | 4.1.18 | Styling | Already used |
| @dnd-kit/sortable | 10.0.0 | Drag-drop reordering | Already used (ColumnManager.tsx) |
| @radix-ui/react-dialog | 1.1.15 | Modal dialogs | Already used |
| Supabase | 2.91.1 | Database + Storage | Already used |
| React Query | 5.90.20 | Server state | Already used |
| Zustand | 5.0.10 | Client state | Already used |
| date-fns | 4.1.0 | Date formatting | Already used |

### No New Dependencies Needed
All required functionality can be built with existing stack:
- Sortable list: @dnd-kit/sortable (already installed)
- Form inputs: Native HTML + Tailwind (existing pattern)
- Date picker: Native `<input type="date">` (existing pattern)
- Photo upload: PhotoUpload component (exists in src/components/tester/)
- JSONB handling: Direct Supabase insert/select (existing pattern in remediation_plans)

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── controls/
│   │   ├── ControlDetailPanel.tsx  # MODIFY: Add TestStepsSection
│   │   ├── TestStepsEditor.tsx     # NEW: Add/edit/reorder steps
│   │   └── TestStepItem.tsx        # NEW: Single step config (sortable)
│   ├── rct/
│   │   ├── ControlPanel.tsx        # MODIFY: Show steps read-only
│   │   └── TestStepsDisplay.tsx    # NEW: Read-only step list
│   └── tester/
│       ├── TestWizard.tsx          # MODIFY: Dynamic procedure steps
│       ├── StepInput.tsx           # NEW: Render step by input type
│       └── CannotRecordReason.tsx  # NEW: Skip step with reason
├── types/
│   └── rct.ts                      # MODIFY: Add TestStep types
├── hooks/
│   └── useControls.ts              # MODIFY: Handle test_steps field
└── lib/
    └── supabase/types.ts           # MODIFY: Add test_steps to ControlRow

supabase/migrations/
└── 00035_test_steps.sql            # NEW: Add test_steps and step_responses columns
```

### Pattern 1: Test Step Type Definitions
**What:** TypeScript types for test step configuration and responses
**When to use:** All step-related code
**Example:**
```typescript
// src/types/rct.ts additions

/**
 * Input types for test step responses
 */
export type TestStepInputType = 'text' | 'binary' | 'multiple_choice' | 'number' | 'date'

/**
 * TestStep - Configuration for a single test procedure step
 */
export interface TestStep {
  id: string                          // UUID for stable identity
  label: string                       // Display text for the step
  inputType: TestStepInputType        // What kind of input to show
  options?: string[]                  // For multiple_choice: available options
  required: boolean                   // Must complete to proceed
  helpText?: string                   // Optional guidance for tester
  order: number                       // Display order (0-indexed)
}

/**
 * StepResponse - Tester's response to a single step
 */
export interface StepResponse {
  stepId: string                      // References TestStep.id
  value: string | number | boolean | null  // The recorded response
  cannotRecord: boolean               // Tester couldn't complete step
  cannotRecordReason?: string         // Required if cannotRecord is true
  evidenceUrl?: string                // Optional per-step photo URL
  recordedAt: string                  // ISO timestamp
}

// Extend existing Control interface
export interface Control {
  // ... existing fields ...
  testProcedure?: string              // Legacy free-text (keep for backward compat)
  testSteps?: TestStep[]              // NEW: Structured steps (optional)
}

// Extend existing ControlTest interface
export interface ControlTest {
  // ... existing fields ...
  stepResponses?: StepResponse[]      // NEW: Per-step responses
}
```

### Pattern 2: JSONB Storage with Backward Compatibility
**What:** Database schema that supports both legacy and new formats
**When to use:** Migration design
**Example:**
```sql
-- supabase/migrations/00035_test_steps.sql

-- Add test_steps JSONB column to controls
-- This is NULLABLE - controls without steps continue using test_procedure TEXT
ALTER TABLE public.controls
ADD COLUMN test_steps JSONB DEFAULT NULL;

COMMENT ON COLUMN public.controls.test_steps IS
  'JSONB array of {id, label, inputType, options, required, helpText, order} for structured test procedures';

-- Add step_responses JSONB column to control_tests
ALTER TABLE public.control_tests
ADD COLUMN step_responses JSONB DEFAULT NULL;

COMMENT ON COLUMN public.control_tests.step_responses IS
  'JSONB array of {stepId, value, cannotRecord, cannotRecordReason, evidenceUrl, recordedAt}';
```

### Pattern 3: Sortable Step Editor (Reusing dnd-kit Pattern)
**What:** Drag-drop list for adding/editing/reordering test steps
**When to use:** Controls Hub edit form
**Example:**
```typescript
// Based on existing ColumnManager.tsx pattern
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface TestStepsEditorProps {
  steps: TestStep[]
  onChange: (steps: TestStep[]) => void
  disabled?: boolean
}

function SortableStepItem({ step, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 p-3 bg-surface-overlay border rounded-lg">
      <button {...attributes} {...listeners} className="cursor-grab">
        <GripVertical size={18} />
      </button>
      <span className="flex-1">{step.label}</span>
      <span className="px-2 py-0.5 text-xs rounded bg-accent-500/20 text-accent-400">
        {step.inputType}
      </span>
      <button onClick={() => onEdit(step)}><Edit2 size={16} /></button>
      <button onClick={() => onDelete(step.id)}><Trash2 size={16} /></button>
    </div>
  )
}

export function TestStepsEditor({ steps, onChange, disabled }: TestStepsEditorProps) {
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIndex = steps.findIndex(s => s.id === active.id)
      const newIndex = steps.findIndex(s => s.id === over.id)
      const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, order: i }))
      onChange(reordered)
    }
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
        {steps.map(step => (
          <SortableStepItem key={step.id} step={step} ... />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

### Pattern 4: Dynamic Step Input Rendering
**What:** Component that renders appropriate input for step type
**When to use:** TestWizard procedure step rendering
**Example:**
```typescript
// src/components/tester/StepInput.tsx
interface StepInputProps {
  step: TestStep
  value: string | number | boolean | null
  onChange: (value: string | number | boolean | null) => void
  cannotRecord: boolean
  onCannotRecordChange: (cannot: boolean, reason?: string) => void
}

export function StepInput({ step, value, onChange, cannotRecord, onCannotRecordChange }: StepInputProps) {
  if (cannotRecord) {
    return <CannotRecordReason onReasonChange={(reason) => onCannotRecordChange(true, reason)} />
  }

  switch (step.inputType) {
    case 'binary':
      return (
        <div className="flex gap-3">
          <button
            onClick={() => onChange(true)}
            className={clsx('flex-1 min-h-[64px] rounded-lg border-2', value === true ? 'bg-green-500/10 border-green-500' : 'border-surface-border')}
          >
            Yes
          </button>
          <button
            onClick={() => onChange(false)}
            className={clsx('flex-1 min-h-[64px] rounded-lg border-2', value === false ? 'bg-red-500/10 border-red-500' : 'border-surface-border')}
          >
            No
          </button>
        </div>
      )

    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {step.options?.map(option => (
            <button
              key={option}
              onClick={() => onChange(option)}
              className={clsx('w-full min-h-[48px] p-3 rounded-lg border-2 text-left', value === option ? 'bg-accent-500/10 border-accent-500' : 'border-surface-border')}
            >
              {option}
            </button>
          ))}
        </div>
      )

    case 'number':
      return (
        <input
          type="number"
          value={value as number ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
          className="w-full min-h-[48px] px-4 py-3 rounded-lg border border-surface-border bg-surface-elevated text-lg"
        />
      )

    case 'date':
      return (
        <input
          type="date"
          value={value as string ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full min-h-[48px] px-4 py-3 rounded-lg border border-surface-border bg-surface-elevated"
        />
      )

    case 'text':
    default:
      return (
        <textarea
          value={value as string ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={step.helpText || 'Enter your response...'}
          rows={3}
          className="w-full px-4 py-3 rounded-lg border border-surface-border bg-surface-elevated resize-y min-h-[100px]"
        />
      )
  }
}
```

### Pattern 5: Extended TestWizard with Procedure Steps
**What:** Insert dynamic procedure steps into existing wizard flow
**When to use:** Mobile test recording
**Example:**
```typescript
// Extended wizard flow
// If control has test_steps: Review > Step1 > Step2 > ... > Result > Evidence > Submit
// If control has NO test_steps: Review > Result > Evidence > Submit (unchanged)

const buildWizardSteps = (control: Control) => {
  const baseSteps = [
    { id: 'confirm', title: 'Review Control', ... },
  ]

  // Insert procedure steps if defined
  if (control.testSteps && control.testSteps.length > 0) {
    const procedureSteps = control.testSteps
      .sort((a, b) => a.order - b.order)
      .map(step => ({
        id: `step-${step.id}`,
        title: step.label,
        subtitle: step.helpText || getInputTypeLabel(step.inputType),
        procedureStep: step,
      }))
    baseSteps.push(...procedureSteps)
  }

  // Final steps
  baseSteps.push(
    { id: 'result', title: 'Test Result', ... },
    { id: 'evidence', title: 'Add Evidence', ... },
    { id: 'review', title: 'Review & Submit', ... },
  )

  return baseSteps
}
```

### Anti-Patterns to Avoid
- **Storing steps in separate table:** JSONB on controls is simpler for this 1:1 relationship; no JOIN needed
- **Using complex form libraries:** Native inputs with Tailwind are sufficient; avoid formik/react-hook-form overhead
- **Forcing structured steps on all controls:** Keep optional - legacy controls with free-text procedure still work
- **Separate evidence table:** Keep per-step evidence URLs in step_responses JSONB; simpler than junction table

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Sortable list | Custom drag-drop | @dnd-kit/sortable | Already installed, proven pattern (ColumnManager.tsx) |
| Date input | Custom date picker | `<input type="date">` | Native works well on mobile, consistent styling |
| Photo upload | New upload component | Existing PhotoUpload.tsx | Already handles Supabase Storage integration |
| JSONB handling | Custom serialization | Direct Supabase insert | Supabase handles JSONB natively |
| Form validation | Validation library | Simple inline checks | Steps are simple; no complex cross-field validation |

**Key insight:** This phase is mostly composition of existing patterns, not new infrastructure.

## Common Pitfalls

### Pitfall 1: Breaking Existing Tests
**What goes wrong:** Existing controls stop working when test_steps is added
**Why it happens:** Code assumes test_steps is always present
**How to avoid:** Always check `control.testSteps?.length > 0` before using; fall back to test_procedure display
**Warning signs:** TypeError on controls created before migration

### Pitfall 2: Losing Step Order on Save
**What goes wrong:** Steps get reordered incorrectly after save
**Why it happens:** Not preserving order field in JSONB
**How to avoid:** Always store `order: number` in each step; re-index on reorder
**Warning signs:** Steps appear in different order after page refresh

### Pitfall 3: Large Step Arrays
**What goes wrong:** Performance issues with many steps
**Why it happens:** Rendering all steps at once in editor
**How to avoid:** Limit to reasonable number (10-20 steps); virtualize if needed later
**Warning signs:** Editor becomes sluggish with many steps

### Pitfall 4: Cannot Record Without Reason
**What goes wrong:** Tester marks step as "cannot record" but no reason captured
**Why it happens:** UI allows skipping without explanation
**How to avoid:** Make reason text mandatory when cannotRecord is true; validate before proceeding
**Warning signs:** Step responses show cannotRecord: true with empty/null reason

### Pitfall 5: Mobile Input Sizing
**What goes wrong:** Inputs too small for touch on mobile
**Why it happens:** Using desktop-sized inputs in wizard
**How to avoid:** Enforce min-h-[48px] on all interactive elements (existing standard from Phase 36)
**Warning signs:** Testers struggle to tap buttons on mobile

## Code Examples

### Database Migration
```sql
-- supabase/migrations/00035_test_steps.sql
-- Source: Following existing pattern from 00019_remediation_plans.sql

-- Add test_steps to controls table
ALTER TABLE public.controls
ADD COLUMN test_steps JSONB DEFAULT NULL;

COMMENT ON COLUMN public.controls.test_steps IS
  'JSONB array of test step definitions: [{id, label, inputType, options, required, helpText, order}]';

-- Add step_responses to control_tests table
ALTER TABLE public.control_tests
ADD COLUMN step_responses JSONB DEFAULT NULL;

COMMENT ON COLUMN public.control_tests.step_responses IS
  'JSONB array of step responses: [{stepId, value, cannotRecord, cannotRecordReason, evidenceUrl, recordedAt}]';

-- Create index for querying controls with steps
CREATE INDEX idx_controls_has_steps ON public.controls ((test_steps IS NOT NULL));
```

### Supabase Types Update
```typescript
// src/lib/supabase/types.ts additions

export interface ControlRow {
  // ... existing fields ...
  test_steps: TestStep[] | null  // JSONB column
}

export interface ControlTestRow {
  // ... existing fields ...
  step_responses: StepResponse[] | null  // JSONB column
}
```

### Transformer Function Update
```typescript
// src/hooks/useControls.ts - toControl function
function toControl(row: ControlRow): Control {
  return {
    // ... existing mappings ...
    testProcedure: row.test_procedure ?? undefined,
    testSteps: row.test_steps ?? undefined,  // NEW
  }
}

// Insert/update should pass test_steps directly - Supabase handles JSONB
```

### Read-Only Steps Display
```typescript
// src/components/rct/TestStepsDisplay.tsx
interface TestStepsDisplayProps {
  steps: TestStep[]
}

export function TestStepsDisplay({ steps }: TestStepsDisplayProps) {
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-2">
      <h5 className="text-xs font-medium text-text-muted uppercase tracking-wider">
        Test Steps ({steps.length})
      </h5>
      <ol className="space-y-2 list-decimal list-inside">
        {sortedSteps.map(step => (
          <li key={step.id} className="text-sm text-text-secondary">
            <span className="text-text-primary">{step.label}</span>
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-surface-overlay rounded">
              {step.inputType}
            </span>
            {step.required && (
              <span className="ml-1 text-xs text-red-400">*</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Free-text procedures | Structured step arrays | This phase | Guided, repeatable testing |
| Single evidence field | Per-step evidence | This phase | Richer audit trail |
| Static wizard steps | Dynamic step injection | This phase | Flexible procedure lengths |

**Deprecated/outdated:**
- None - this is a new feature, not replacing existing patterns

## Open Questions

1. **Maximum Steps Per Control**
   - What we know: JSONB can store large arrays; UI should limit for usability
   - What's unclear: What's a reasonable limit? 10? 20? 50?
   - Recommendation: Soft limit of 20 steps with warning; no hard database limit

2. **Step Response Evidence Retention**
   - What we know: Per-step photos use same storage bucket as overall evidence
   - What's unclear: Should per-step evidence have different retention policy?
   - Recommendation: Same policy as overall evidence (Supabase Storage lifecycle rules)

3. **Step Templates/Reuse**
   - What we know: This phase focuses on per-control steps
   - What's unclear: Do users want step templates to reuse across controls?
   - Recommendation: Defer to future phase; copy-paste between controls is sufficient for now

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis:
  - `src/components/rct/ColumnManager.tsx` - dnd-kit sortable pattern
  - `src/hooks/useRemediationPlans.ts` - JSONB array handling
  - `src/components/tester/TestWizard.tsx` - Wizard step structure
  - `src/components/tester/PhotoUpload.tsx` - Evidence upload pattern
  - `supabase/migrations/00019_remediation_plans.sql` - JSONB column pattern
  - `supabase/migrations/00015_controls.sql` - Controls table schema
  - `supabase/migrations/00018_control_tests.sql` - Control tests schema

### Secondary (MEDIUM confidence)
- PostgreSQL JSONB documentation - storage and indexing
- @dnd-kit documentation - sortable API

### Tertiary (LOW confidence)
- None - all patterns verified with existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all components already in project
- Database schema: HIGH - follows established JSONB patterns (remediation_plans, pending_changes)
- UI patterns: HIGH - reusing existing sortable, form, wizard patterns
- Mobile wizard extension: HIGH - TestWizard structure supports dynamic steps

**Research date:** 2026-01-28
**Valid until:** 2026-03-28 (60 days - stable domain, internal feature)

---

## Existing Code Reuse Summary

### Reuse As-Is
| Component | Location | Reuse For |
|-----------|----------|-----------|
| PhotoUpload | `src/components/tester/PhotoUpload.tsx` | Per-step evidence capture |
| useSortable | @dnd-kit/sortable | Step reordering in editor |
| JSONB handling | `src/hooks/useRemediationPlans.ts` | Pattern for array columns |

### Enhance
| Component | Current | Enhancement |
|-----------|---------|-------------|
| TestWizard | Fixed 4-step flow | Dynamic procedure steps injection |
| ControlDetailPanel | No steps section | Add TestStepsEditor section |
| ControlPanel | No steps display | Add read-only TestStepsDisplay |
| useControls hooks | No test_steps | Add field to transformer |

### Create New
| Component | Purpose |
|-----------|---------|
| TestStepsEditor | Add/edit/reorder steps in Controls Hub |
| TestStepItem | Single sortable step in editor |
| StepInput | Dynamic input rendering by type |
| TestStepsDisplay | Read-only step list for RCT panel |
| CannotRecordReason | Skip step with mandatory reason |

## Recommendations for Planning

### Plan 1: Database Schema (Foundation)
- Add migration for test_steps on controls
- Add migration for step_responses on control_tests
- Update Supabase types
- Update toControl/toControlTest transformers

### Plan 2: Controls Hub Step Editor
- Create TestStepsEditor component with dnd-kit
- Create TestStepItem sortable component
- Create add/edit step dialog
- Integrate into ControlDetailPanel

### Plan 3: Mobile Wizard Extension
- Create StepInput component for all input types
- Create CannotRecordReason component
- Extend TestWizard to inject procedure steps
- Update step_responses in submission

### Plan 4: Read-Only Displays
- Create TestStepsDisplay component
- Add to RCT ControlPanel
- Add to ControlTestSection (show step responses in history)

### Plan 5: Testing & Polish
- Verify backward compatibility with legacy controls
- Test all input types on mobile
- Test offline submission with step_responses
