---
status: diagnosed
trigger: "Diagnose root cause of sunburst sizing and text clipping issue"
created: 2026-01-27T10:00:00Z
updated: 2026-01-27T10:15:00Z
symptoms_prefilled: true
goal: find_root_cause_only
---

## Current Focus

hypothesis: Container uses fixed 600x600 dimensions instead of responsive sizing; labels truncate at 20 chars without text wrapping
test: Verified by reading SunburstPage.tsx and SunburstChart.tsx
expecting: Find hardcoded dimensions and truncation logic
next_action: Document root causes

## Symptoms

expected: Sunburst should use more screen real estate; L1 names should wrap when there's room
actual: Sunburst box is limited; L1 names clip/cut off
errors: None (visual/UX issue)
reproduction: View sunburst page on larger screens
started: Always been this way (design limitation)

## Evidence

- timestamp: 2026-01-27T10:05:00Z
  checked: SunburstPage.tsx lines 31-38
  found: Container uses `flex-1 flex justify-center items-center` but chart is passed hardcoded `width={600} height={600}`
  implication: Chart size is fixed at 600x600 regardless of available screen space

- timestamp: 2026-01-27T10:08:00Z
  checked: SunburstChart.tsx props (lines 14-19, 35-37)
  found: Props default to `width = 600, height = 600` and parent passes these exact values
  implication: No responsive sizing mechanism exists

- timestamp: 2026-01-27T10:10:00Z
  checked: SunburstChart.tsx line 589
  found: Label rendering truncates with `{label.length > 20 ? label.substring(0, 20) + '...' : label}`
  implication: Hard truncation at 20 characters, no text wrapping logic

- timestamp: 2026-01-27T10:12:00Z
  checked: getNodeLabel function (lines 300-316)
  found: Returns single string label, no multi-line support
  implication: SVG text element uses single-line rendering, not tspan-based wrapping

- timestamp: 2026-01-27T10:14:00Z
  checked: Label arc threshold (line 305-308)
  found: Labels only show if arcAngle > 0.1; with name if arcAngle > 0.2
  implication: Arc size determines label visibility, but not label length accommodation

## Eliminated

(none - direct findings)

## Resolution

root_cause: |
  TWO INDEPENDENT ISSUES:

  1. FIXED CONTAINER SIZE: SunburstPage.tsx passes hardcoded width={600} height={600}
     to SunburstChart. The parent container is flex-1 (fills available space) but
     the chart SVG itself is fixed at 600x600 pixels.

  2. LABEL TRUNCATION WITHOUT WRAPPING: SunburstChart.tsx line 589 uses substring
     truncation `label.substring(0, 20) + '...'` instead of SVG text wrapping.
     SVG <text> elements don't natively wrap, so longer L1 names get cut off
     even when the arc segment has visual room for more text.

fix: (not applied - diagnosis only)

verification: (not verified - diagnosis only)

files_changed: []

---

## Suggested Fix Direction

### Issue 1: Container Sizing

**Current code (SunburstPage.tsx:33):**
```tsx
<SunburstChart ref={svgRef} width={600} height={600} />
```

**Fix approach:**
- Use a ResizeObserver or container query to measure parent dimensions
- Pass dynamic width/height based on available space (e.g., min(containerWidth, containerHeight))
- Consider a minimum size (400px) and maximum (800px or 90vh)

### Issue 2: Label Clipping

**Current code (SunburstChart.tsx:589):**
```tsx
{label.length > 20 ? label.substring(0, 20) + '...' : label}
```

**Fix approach:**
- Calculate available arc length based on `(arcData.y0 + arcData.y1) / 2` midpoint radius and arc angle
- Use SVG `<tspan>` elements for multi-line text wrapping within arcs
- Or: Calculate max characters that fit based on approximate char width and available space
- Consider: For L1 (outermost ring), arcs are typically wider so can accommodate more text
