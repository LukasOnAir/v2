# RiskGuard ERM

## What This Is

A multi-tenant Enterprise Risk Management (ERM) SaaS platform that enables organizations to systematically identify, assess, and control risks across their business processes. Features dual hierarchical taxonomy builders (risks and processes), a dynamic Risk Control Table with Excel-like filtering and conditional control workflows, Risk-Process Matrix with weighted aggregation, interactive sunburst visualization, control testing and remediation tracking, audit trail, analytics, collaboration features, tickets, and four-eye approval workflow. Production-ready platform with Supabase backend, role-based access control, and automated email notifications. First production customer: Holland Casino.

## Core Value

Enable organizations to see which business processes face unacceptable risks and ensure controls are in place where needed.

## Current Milestone: v2.0 Production Backend

**Goal:** Transform the demo-ready v1.0 into a production SaaS platform with real persistence, authentication, multi-tenancy, and automated notifications.

**Target features:**
- Supabase backend with PostgreSQL replacing LocalStorage
- Multi-tenancy with row-level security for enterprise data isolation
- Real authentication with email/password and invite flow
- Five production roles: Director, Manager, Risk Manager, Control Owner, Control Tester
- Automated email notifications via Resend (test reminders, approvals, deadlines)
- Scheduled jobs via pg_cron and Vercel cron
- Demo data seeders for sales (Empty, Casino, Bank, Insurer, Generic)
- Production hardening: error handling, logging, security, monitoring
- Vercel deployment

## Current State

**Version:** v1.0 MVP (shipped 2026-01-24)
**Codebase:** 23,031 lines TypeScript across 145 files
**Tech stack:** React + TypeScript + Vite + Tailwind CSS v4 + Zustand + LocalStorage + D3 + Recharts + Motion

## Requirements

### Validated

- RTAX-01 through RTAX-05: Risk taxonomy with 5-level hierarchy — v1.0
- PTAX-01 through PTAX-05: Process taxonomy with 5-level hierarchy — v1.0
- RCT-01 through RCT-08: Risk Control Table with scoring and controls — v1.0
- COL-01 through COL-04: Column visibility, filtering, custom columns — v1.0
- RPM-01 through RPM-05: Risk-Process Matrix with aggregation — v1.0
- EXP-01: Excel export — v1.0
- ROLE-01 through ROLE-03: Role-based access (Risk Manager, Control Owner) — v1.0
- UI-01 through UI-04: Dark theme, animations, responsive, performant — v1.0
- TEST-01 through TEST-03: Control testing with scheduling — v1.0

**Additional features delivered:**
- VIS-01 through VIS-03: Sunburst visualization with zoom and drill-down — v1.0
- WEIGHT-01, WEIGHT-02: Configurable aggregation weights — v1.0
- REM-01 through REM-03: Remediation and issue tracking — v1.0
- AUDIT-01, AUDIT-02: Audit trail with change history — v1.0
- ANALYTICS-01 through ANALYTICS-03: Trend analysis and sampling — v1.0
- COLLAB-01, COLLAB-02: Comments and knowledge base — v1.0
- CTRL-01 through CTRL-03: Controls Hub with multi-risk linking — v1.0
- DELTA-01: Delta score views (gross-net, vs appetite) — v1.0
- TICKET-01 through TICKET-03: Control tickets with Kanban — v1.0
- APPROVAL-01 through APPROVAL-03: Four-eye approval workflow — v1.0
- LOGIN-01: Animated login page — v1.0
- DEMO-01: Mock data loader — v1.0
- TESTER-01, TESTER-02: Control Tester interface — v1.0

### Active

(Defined in REQUIREMENTS.md for v2.0)

### Out of Scope

- SSO/Corporate login — Email/password sufficient for v2; SSO deferred to v3
- Mobile app — Web-first; responsive design covers tablets
- Real-time collaboration — Not needed; adds sync complexity
- Import from Excel — Demo seeders cover onboarding; import deferred
- AI risk suggestions — Emerging tech; defer to v3+
- Quantitative modeling — Monte Carlo/VaR requires specialized expertise
- Full GRC suite — Focus on ERM; compliance is separate domain
- i18n/multi-language — English only; i18n adds maintenance burden

## Context

**Target Customer:** Holland Casino — a major gaming/entertainment company in the Netherlands with significant regulatory and operational risk management needs. High security standards required.

**Production Goal:** Deploy production SaaS platform with multi-tenant architecture. Director creates users via email invite. Automated notifications keep users informed of tests, approvals, and deadlines.

**Demo Seeders:** Five presets for sales demos running on production infrastructure:
- Empty — blank start
- Casino — Holland Casino themed mock data
- Bank — banking/financial mock data
- Insurer — insurance mock data
- Generic — general ERM mock data

**Domain Concepts:**
- **Risk taxonomy:** Hierarchical categorization of risk types (e.g., Operational → IT → Cyberattack)
- **Process taxonomy:** Hierarchical categorization of business processes
- **Risk-Process Matrix:** Visual representation of which risks affect which processes (aggregated view)
- **Risk Control Table:** Detailed assessment and control tracking for each risk-process combination
- **Gross vs Net risk:** Gross = inherent risk before controls; Net = residual risk after controls

**Scoring Model:**
- Probability: 1-5 scale (1 = Rare, 5 = Almost Certain)
- Impact: 1-5 scale (1 = Negligible, 5 = Catastrophic)
- Risk Score: Probability × Impact (range 1-25)
- Risk Appetite: Threshold above which controls are required

**User Roles (v2.0):**
- Director: Creates users via invite, assigns roles, manages organization
- Manager: Approves changes when four-eye enabled
- Risk Manager: Full access to all ERM features
- Control Owner: View-only, can request changes
- Control Tester: Can only see and test assigned controls

## Constraints

- **Frontend stack**: React + TypeScript + Vite + Tailwind CSS v4 + Zustand + D3 + Recharts + Motion
- **Backend stack**: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- **Email service**: Resend for transactional emails
- **Deployment**: Vercel for frontend, Supabase hosted for backend
- **Multi-tenancy**: Row-level security with tenant_id on all tables
- **Scheduling**: pg_cron (database) + Vercel cron (application)
- **Security**: Enterprise-grade for Holland Casino requirements
- **Performance**: Must handle hundreds of risks/processes without UI lag
- **Accessibility**: Modern browsers (Chrome, Firefox, Edge, Safari)
- **Code Quality**: Production-level error handling, logging, monitoring

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React + TypeScript + Vite | Fast, modern, clean code, good DX | Good |
| Tailwind CSS v4 with @tailwindcss/vite | Zero-config, utility-first | Good |
| Zustand for state | Minimal boilerplate, performant | Good |
| LocalStorage for MVP | No backend needed for demo | Good |
| immer middleware | Nested immutable updates | Good |
| TanStack Table + Virtual | Virtualization for large datasets | Good |
| D3 for sunburst | Powerful hierarchical visualization | Good |
| Recharts for analytics | Simple, React-native charts | Good |
| Motion (framer-motion) | Smooth login animations | Good |
| Four-eye approval pattern | Enterprise compliance requirement | Good |
| Control Tester role | First-line worker isolation | Good |
| Supabase for backend | Hosted PostgreSQL + Auth + RLS, fast to ship | — |
| Row-level security | Database-enforced multi-tenancy, most secure | — |
| Resend for emails | Modern API, great DX, Vercel integration | — |
| Vercel deployment | Seamless React deployment, edge functions | — |

---
*Last updated: 2026-01-24 after starting v2.0 milestone*
