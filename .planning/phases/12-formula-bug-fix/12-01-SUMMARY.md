---
phase: 12-formula-bug-fix
plan: 01
status: complete
duration: 2 min
---

# Plan 12-01 Summary: Fix Formula Engine

## What Was Built

1. **normalizeQuotes() function** (lines 4-12)
   - Converts smart/curly quotes to straight quotes
   - Handles Unicode characters: U+201C-201F (double), U+2018-201B (single)
   - Applied before parsing to fix copy-paste from Word/email

2. **evaluateFormula() updated** (line 25, 64)
   - Added `normalizedFormula = normalizeQuotes(formula)` preprocessing
   - Changed `parser.parse(normalizedFormula)` to use normalized input

3. **validateFormula() updated** (lines 85, 110-126, 142)
   - Added quote normalization preprocessing
   - Added unquoted string detection for IF function arguments
   - Provides helpful error: `"High" looks like text. Add quotes: "High" or 'High'`
   - Uses normalized formula for parsing

## Verification

- [x] normalizeQuotes function handles all smart quote variants
- [x] evaluateFormula applies normalization before parsing
- [x] validateFormula applies normalization before parsing
- [x] Unquoted string detection provides helpful error message
- [x] npx tsc --noEmit passes

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| src/utils/formulaEngine.ts | +30 | Quote normalization and unquoted string detection |

## Key Changes

```typescript
// New helper function
function normalizeQuotes(formula: string): string {
  return formula
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
}

// Unquoted string detection in validateFormula
const ifMatch = normalizedFormula.match(/IF\s*\([^,]+,\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:,|\))/i)
if (ifMatch && !isKnownVariable(ifMatch[1])) {
  return { valid: false, error: `"${ifMatch[1]}" looks like text. Add quotes...` }
}
```

---
*Completed: 2026-01-22*
