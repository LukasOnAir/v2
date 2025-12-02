# Phase 3: Risk Control Table - Context

## Phase Goal
User can assess and control risks for all risk-process combinations with Excel-like filtering

## User Decisions

### 1. Table Generation Logic

**Row generation:** Cartesian product of lowest-level risks × lowest-level processes

**Taxonomy sync behavior:** Auto-sync with confirmation
- When taxonomy changes (add/remove/move items), show dialog: "Taxonomy changed. Add X new rows, remove Y orphaned rows?"
- User confirms before changes apply to RCT

**Hierarchy columns:** Expanded by default
- Show all L1-L5 columns for both Risk and Process
- User can toggle to show only lowest-level to free up screen space

### 2. Scoring Interface

**Score input:** Visual scale selector
- Click cell shows 5 clickable boxes/circles representing 1-5
- Click to select score
- Labels: 1-Rare, 2-Unlikely, 3-Possible, 4-Likely, 5-Almost Certain (probability)
- Labels: 1-Negligible, 2-Minor, 3-Moderate, 4-Major, 5-Catastrophic (impact)

**Risk score display:** Heatmap-style cell
- Full cell colored by severity (green → yellow → orange → red)
- Number displayed in contrasting text
- Score = Probability × Impact (range 1-25)

### 3. Control Columns Behavior

**Control trigger:** Manual via "Add Controls" button
- Button always available regardless of risk appetite
- Opens side panel with control manager
- Controls managed in side panel (not inline columns)

**Risk Appetite indicator:** "Within Risk Appetite" cell
- Shows delta: (Risk Appetite - Gross/Net Score)
- Heatmap colored (green if positive/within, red if negative/exceeded)
- Per-row appetite column (default value TBD, likely 9)

### 4. Filtering & Column Management

**Filter style:** Header dropdown menus
- Click filter icon in column header
- Dropdown shows checkboxes for all unique values
- Multi-select with clear option

**Custom columns:** Toolbar "Add Column" button
- Configure name and type
- Types: Text, Number, Dropdown, Date, Formula

**Formula support:** Excel-like formulas
- Reference other columns
- Functions: IF, SUM, AVG, MAX, MIN
- Example: =IF(Gross_Score>15, 'High', 'Low')

## Requirements Mapped

From PROJECT.md:
- RCT-01: Auto-generated from lowest-level taxonomy combinations
- RCT-02: Each row = one lowest-level risk × one lowest-level process
- RCT-03: Pre-filled columns from taxonomies (L1-L5 Risk/Process ID, Name, Description)
- RCT-04: Empty columns for levels that don't exist in a particular branch
- RCT-05: Gross Probability Score (1-5 scale)
- RCT-06: Gross Impact Score (1-5 scale)
- RCT-07: Gross Risk Score (auto-calculated)
- RCT-08: Risk Appetite threshold column
- COL-01: All columns hideable
- COL-02: Excel-like filtering on column headers
- COL-03: Multi-select filter values
- COL-04: Custom columns with data type selection

## Architecture Considerations

**Data model:**
- RCT rows stored separately from taxonomies
- Each row references risk ID and process ID
- Row data: scores, appetite, control references, custom column values

**Side panel control manager:**
- Multiple controls per row possible
- Control has: description, net probability, net impact, net score (calculated)
- Net score displayed in main table (lowest/average from controls TBD)

**Performance:**
- Virtualized table for large datasets (hundreds of rows)
- Efficient filtering without re-rendering entire table

---
*Context captured: 2026-01-19*
*Source: /gsd:discuss-phase 3*
