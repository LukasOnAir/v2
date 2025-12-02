# Phase 24: Demo Seeders & Deployment - Research

**Researched:** 2026-01-25
**Domain:** Database seeding, Vercel deployment, mobile responsiveness, server-side validation
**Confidence:** HIGH

## Summary

Phase 24 covers four distinct domains: (1) demo data seeders for 5 tenant presets, (2) Vercel deployment configuration, (3) server-side validation for SEC-04, and (4) mobile responsiveness for Control Tester interface.

The standard approach involves Supabase Edge Functions for seeder execution (not seed.sql since we need runtime tenant creation), Vercel's zero-config deployment with SPA rewrites, Zod schemas in Edge Functions for validation, and Tailwind CSS v4's mobile-first responsive utilities.

**Primary recommendation:** Create an Edge Function `seed-demo-data` that accepts a preset name and tenant_id, inserts appropriate demo data. Directors call this function after tenant creation. Deploy to Vercel with environment variables configured via dashboard.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Supabase Edge Functions | Deno runtime | Demo seeder execution | Already used for accept-invitation, send-invitation |
| Vercel | - | Deployment platform | Already configured with vercel.json |
| Zod | ^4.3.6 | Server-side validation | Already in package.json, used for auth forms |
| Tailwind CSS | ^4.1.18 | Mobile responsiveness | Already configured with v4 theme |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | ^4.1.0 | Date generation for test schedules | Already in package.json |
| nanoid | - | ID generation in seeders | Already used in stores |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Edge Function seeder | seed.sql | seed.sql runs at reset only, not per-tenant |
| Zod in Edge Functions | Manual validation | Already doing manual, Zod adds type safety |
| Tailwind breakpoints | CSS media queries | Tailwind already configured, consistent patterns |

**Installation:**
```bash
# No new dependencies needed - all already installed
```

## Architecture Patterns

### Demo Seeder Structure
```
supabase/functions/
  seed-demo-data/
    index.ts          # Main handler with preset routing
    presets/
      empty.ts        # Empty preset (no-op)
      casino.ts       # Holland Casino themed data
      bank.ts         # Banking/financial data
      insurer.ts      # Insurance themed data
      generic.ts      # General ERM sample data
    data/
      risk-taxonomies.ts    # Risk category trees by preset
      process-taxonomies.ts # Process trees by preset
      controls.ts           # Sample controls by preset
      test-schedules.ts     # Test dates and frequencies
```

### Seed Data Flow
```
Director creates tenant (Phase 21)
    |
    v
Director selects preset during onboarding
    |
    v
Frontend calls seed-demo-data Edge Function
    |
    v
Edge Function:
  1. Validates tenant_id ownership (user is director of this tenant)
  2. Loads preset data module
  3. Inserts risk taxonomy
  4. Inserts process taxonomy
  5. Generates RCT rows from taxonomy crossproduct
  6. Inserts controls linked to RCT rows
  7. Sets up test schedules
    |
    v
Tenant has realistic demo data
```

### Pattern 1: Preset Data Modules
**What:** Each preset is a TypeScript module exporting data structures
**When to use:** Demo data generation
**Example:**
```typescript
// supabase/functions/seed-demo-data/presets/casino.ts
import type { TaxonomyItem } from './types.ts'

export const riskTaxonomy: TaxonomyItem[] = [
  {
    name: 'Operational Risk',
    description: 'Risks from internal operations and processes',
    children: [
      {
        name: 'Gaming Operations',
        description: 'Risks related to casino floor operations',
        children: [
          { name: 'Table Game Integrity', description: 'Card counting, cheating, collusion' },
          { name: 'Slot Machine Malfunction', description: 'Technical failures, payout errors' },
          { name: 'Cash Handling', description: 'Errors in cage operations, chip counts' },
        ]
      },
      {
        name: 'Security',
        description: 'Physical and digital security risks',
        children: [
          { name: 'Theft & Fraud', description: 'Employee theft, customer fraud' },
          { name: 'Surveillance Gaps', description: 'Camera coverage, monitoring failures' },
        ]
      }
    ]
  },
  {
    name: 'Compliance Risk',
    description: 'Regulatory and legal compliance risks',
    children: [
      {
        name: 'AML/KYC',
        description: 'Anti-money laundering compliance',
        children: [
          { name: 'CTR Filing', description: 'Currency Transaction Report compliance' },
          { name: 'SAR Filing', description: 'Suspicious Activity Report compliance' },
          { name: 'Customer Due Diligence', description: 'Know Your Customer procedures' },
        ]
      },
      {
        name: 'Gaming License',
        description: 'License maintenance and conditions',
        children: [
          { name: 'Reporting Requirements', description: 'Regulatory filings and disclosures' },
          { name: 'Employee Licensing', description: 'Staff gaming permits and background checks' },
        ]
      }
    ]
  },
  // ... more categories
]

export const processTaxonomy: TaxonomyItem[] = [
  {
    name: 'Gaming Floor',
    description: 'Casino gaming operations',
    children: [
      { name: 'Table Games', description: 'Blackjack, roulette, poker operations' },
      { name: 'Slot Operations', description: 'Slot machine management' },
      { name: 'Cage Operations', description: 'Cash handling and chip exchange' },
    ]
  },
  // ... more processes
]

export const sampleControls = [
  {
    name: 'Dual Verification for High-Value Payouts',
    description: 'Two staff members must verify any payout over 10,000 EUR',
    controlType: 'Preventative',
    testFrequency: 'monthly',
  },
  // ... more controls
]
```

### Pattern 2: Zod Validation in Edge Functions
**What:** Server-side schema validation before database operations
**When to use:** All Edge Functions accepting user input (SEC-04)
**Example:**
```typescript
// supabase/functions/seed-demo-data/index.ts
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const SeedRequestSchema = z.object({
  preset: z.enum(['empty', 'casino', 'bank', 'insurer', 'generic']),
  tenantId: z.string().uuid(),
})

serve(async (req) => {
  // ... auth checks ...

  const body = await req.json()
  const parseResult = SeedRequestSchema.safeParse(body)

  if (!parseResult.success) {
    return new Response(
      JSON.stringify({
        error: 'Invalid request',
        details: parseResult.error.flatten()
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { preset, tenantId } = parseResult.data
  // ... proceed with validated data
})
```

### Pattern 3: Mobile-First Responsive Layout
**What:** Tailwind utilities for mobile-optimized Control Tester interface
**When to use:** MOBILE-01 implementation
**Example:**
```tsx
// TesterControlCard - mobile responsive pattern
<div className="border rounded-lg p-3 sm:p-4 transition-colors">
  {/* Header: stack on mobile, row on larger screens */}
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
    <div className="flex-1 min-w-0">
      <h3 className="text-sm sm:text-base font-medium text-text-primary">
        {control.name}
      </h3>
    </div>
    {/* Badges wrap naturally on mobile */}
    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
      {/* status badges */}
    </div>
  </div>

  {/* Quick info: stack on mobile, row on larger */}
  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 mt-3 text-xs sm:text-sm">
    <div><span className="text-text-muted">Frequency:</span> {control.testFrequency}</div>
    <div><span className="text-text-muted">Next Test:</span> {formatDate(control.nextTestDate)}</div>
  </div>
</div>
```

### Anti-Patterns to Avoid
- **Hard-coded demo data in frontend:** Defeats multi-tenant isolation, visible in client bundle
- **Using seed.sql for per-tenant data:** seed.sql runs at db reset, not per-tenant creation
- **Desktop-first responsive:** Tailwind is mobile-first, use unprefixed for mobile, sm: for larger
- **Skipping validation in Edge Functions:** Edge Functions bypass RLS, must validate manually

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Manual if/else checks | Zod safeParse | Type inference, error formatting |
| Mobile detection | JS window.innerWidth | Tailwind breakpoints | CSS-based, no JS hydration |
| UUID generation | crypto.randomUUID | Supabase gen_random_uuid() | DB-side ensures consistency |
| Date formatting | Manual string concat | date-fns format | Locale-aware, tested edge cases |
| Risk taxonomy structure | Flat arrays | TaxonomyItem with children | Already typed, tree traversal utils exist |

**Key insight:** The existing codebase has patterns for all these - reuse store structures, existing types, established utilities.

## Common Pitfalls

### Pitfall 1: Seeding Without Tenant Context
**What goes wrong:** Demo data inserted without tenant_id, visible to all tenants
**Why it happens:** Forgetting multi-tenant isolation in seeder logic
**How to avoid:** Always include tenant_id in every insert, verify tenant ownership before seeding
**Warning signs:** Demo data appearing across tenant boundaries

### Pitfall 2: Service Role Key in Frontend
**What goes wrong:** Service role key exposed in client bundle, full DB access
**Why it happens:** Accidentally using service role for seeder calls from frontend
**How to avoid:** Call Edge Function with user JWT, Edge Function uses service role internally
**Warning signs:** SUPABASE_SERVICE_ROLE_KEY in .env referenced by frontend code

### Pitfall 3: Mobile-First Confusion
**What goes wrong:** sm: breakpoint used for "small screens" instead of "small and up"
**Why it happens:** Misunderstanding Tailwind's mobile-first approach
**How to avoid:** Unprefixed = mobile, sm: = 640px and up, md: = 768px and up
**Warning signs:** Styles look correct on desktop but broken on mobile

### Pitfall 4: Environment Variables Not in Vercel
**What goes wrong:** Build succeeds locally, fails/crashes on Vercel
**Why it happens:** VITE_* prefix needed for build-time vars, secrets not configured in Vercel
**How to avoid:** Add all env vars via Vercel dashboard before first deploy
**Warning signs:** "undefined" values in production, Supabase calls failing

### Pitfall 5: SPA Routing Without Rewrites
**What goes wrong:** Direct navigation to /tester, /login returns 404 on Vercel
**Why it happens:** Vercel serves static files, doesn't know about React Router
**How to avoid:** vercel.json rewrites already configured - verify it's committed
**Warning signs:** Refresh on any non-root route returns 404

### Pitfall 6: Zod Import in Deno Edge Functions
**What goes wrong:** Import error for Zod in Edge Function
**Why it happens:** npm package vs Deno import syntax
**How to avoid:** Use Deno-compatible import: `https://deno.land/x/zod@v3.22.4/mod.ts`
**Warning signs:** "Module not found" error when deploying Edge Function

## Code Examples

Verified patterns from existing codebase:

### Edge Function with Validation (pattern from accept-invitation)
```typescript
// Source: supabase/functions/accept-invitation/index.ts
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, password } = await req.json()

    // Validate input
    if (!token || !password) {
      return new Response(
        JSON.stringify({ error: 'Token and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ... business logic
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### Existing Mobile-Responsive Pattern (TesterDashboardPage)
```typescript
// Source: src/pages/TesterDashboardPage.tsx
{/* Stats Cards - already responsive */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6">
  <StatCard title="Total Assigned" value={assignedControls.length} ... />
</div>
```

### Zustand Store Structure (matches seeder output)
```typescript
// Source: src/types/taxonomy.ts - existing type structure
export interface TaxonomyItem {
  id: string
  hierarchicalId: string
  name: string
  description: string
  children?: TaxonomyItem[]
}
```

### Vercel Configuration (existing)
```json
// Source: vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "crons": [
    {
      "path": "/api/cron/reminders",
      "schedule": "0 8 * * *"
    }
  ]
}
```

## Demo Data Domain Knowledge

### Casino Risk Categories (Holland Casino context)
Based on industry research, casino risk taxonomies should include:

**Level 1 Categories:**
- Operational Risk (gaming operations, security, IT systems)
- Compliance Risk (AML/KYC, gaming license, responsible gambling)
- Financial Risk (cash handling, currency exchange, fraud)
- Strategic Risk (competition, market changes, reputation)

**Key Processes:**
- Gaming Floor (table games, slots, cage operations)
- Customer Services (VIP, loyalty, complaints)
- Back Office (finance, HR, IT)
- Compliance (AML monitoring, reporting, audits)

**Sample Controls:**
- Dual verification for high-value payouts
- 24-hour surveillance coverage on gaming floor
- Daily CTR filing review
- Monthly AML training certification

### Bank Risk Categories
**Level 1 Categories:**
- Credit Risk (lending, counterparty, portfolio)
- Market Risk (interest rate, foreign exchange, equity)
- Operational Risk (fraud, technology, process)
- Compliance Risk (regulatory, conduct, AML)
- Liquidity Risk (funding, asset liquidity)

### Insurance Risk Categories
**Level 1 Categories:**
- Underwriting Risk (pricing, selection, reserving)
- Investment Risk (market, credit, liquidity)
- Operational Risk (claims processing, IT, vendor)
- Compliance Risk (regulatory, reporting, conduct)
- Strategic Risk (market changes, competition)

### Generic ERM Categories
**Level 1 Categories:**
- Strategic Risk
- Operational Risk
- Financial Risk
- Compliance Risk
- Reputational Risk

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| seed.sql for all data | Edge Function per-tenant | Multi-tenant pattern | Proper isolation |
| Zod v3 | Zod v4 (^4.3.6 in package.json) | 2025 | Different import patterns |
| Tailwind v3 | Tailwind v4 | 2025 | rem-based breakpoints, @theme |
| Manual px breakpoints | rem breakpoints in v4 | Tailwind v4 | Consistent with v4 defaults |

**Deprecated/outdated:**
- seed.sql for runtime data: Use for schema fixtures only, not per-tenant
- Tailwind v3 config.js: v4 uses CSS-based @theme

## Open Questions

Things that couldn't be fully resolved:

1. **RCT Row Generation Strategy**
   - What we know: RCT rows are risk x process crossproduct
   - What's unclear: Should seeder generate ALL combinations or curated subset?
   - Recommendation: Curated subset (10-20 meaningful pairings per preset) - full crossproduct would be overwhelming

2. **Preset Selection UI Timing**
   - What we know: Director creates tenant, then selects preset
   - What's unclear: Separate page vs modal during tenant creation?
   - Recommendation: Defer to planner - could be post-creation wizard or admin setting

3. **Data Migration from LocalStorage**
   - What we know: v1.0 stores data in localStorage
   - What's unclear: Will users need to migrate existing local data to Supabase?
   - Recommendation: Out of scope for Phase 24 - demo seeders are for NEW tenants only

## Sources

### Primary (HIGH confidence)
- [Supabase Seeding Documentation](https://supabase.com/docs/guides/local-development/seeding-your-database) - seed.sql format
- [Vercel Vite Documentation](https://vercel.com/docs/frameworks/frontend/vite) - deployment configuration
- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design) - breakpoint system
- Existing codebase: accept-invitation, send-invitation Edge Functions
- Existing codebase: vercel.json, TesterDashboardPage.tsx

### Secondary (MEDIUM confidence)
- [Vercel Environment Variables](https://vercel.com/docs/environment-variables) - secrets management
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions) - Deno runtime details
- Industry research on casino/bank/insurance risk taxonomies

### Tertiary (LOW confidence)
- WebSearch results for domain-specific risk categories (validated against industry sources)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already in use
- Architecture: HIGH - follows existing Edge Function patterns
- Demo data content: MEDIUM - based on industry research, may need domain expert review
- Mobile responsiveness: HIGH - Tailwind v4 docs clear on approach

**Research date:** 2026-01-25
**Valid until:** 30 days (stable domain, established patterns)
