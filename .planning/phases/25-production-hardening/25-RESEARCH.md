# Phase 25: Production Hardening - Research

**Researched:** 2026-01-26
**Domain:** Error handling, observability, monitoring, alerting for React + Supabase + Vercel
**Confidence:** HIGH

## Summary

Phase 25 implements production hardening for a React + TypeScript application deployed on Vercel with Supabase backend. This includes React error boundaries for graceful error handling, structured logging, Vercel Analytics/Speed Insights for monitoring, and alerting integration for uptime/error rate thresholds.

The standard approach uses `react-error-boundary` (v6.1.0) for declarative error boundaries with reset capabilities, Vercel's native Analytics and Speed Insights for web vitals monitoring, and UptimeRobot (free tier) or Vercel Observability Plus for alerting. Structured logging focuses on enhancing existing console.log patterns with JSON-structured context for Edge Functions, while frontend logging remains lightweight (no heavy libraries needed).

**Primary recommendation:** Implement a layered error boundary strategy (app-level + route-level), add Vercel Analytics/Speed Insights components to main.tsx, configure UptimeRobot for free uptime monitoring with Slack/email alerts, and enhance Edge Function logging with structured JSON output.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-error-boundary | ^6.1.0 | Declarative error boundaries | Most popular React error boundary library (1800+ npm dependents), functional API, reset capabilities |
| @vercel/analytics | latest | Web analytics (page views, visitors) | Native Vercel integration, zero-config for Vercel deployments |
| @vercel/speed-insights | latest | Web vitals monitoring (LCP, FID, CLS) | Native Vercel integration, Core Web Vitals tracking |
| sonner | ^2.0.7 | Toast notifications for errors | Already in project, integrates with error handling |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| UptimeRobot | free tier | Uptime monitoring + alerting | Free 50 monitors at 5-min intervals, Slack/email alerts |
| Sentry (optional) | @sentry/react | Advanced error tracking | If deeper error analytics needed beyond basic boundaries |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-error-boundary | Custom class component | More code, less features (no hooks, no reset keys) |
| UptimeRobot | Vercel Observability Plus | UptimeRobot free vs $10/month for Vercel |
| @vercel/analytics | Plausible/Umami | Vercel native is simpler, already integrated with deployment |
| Console logging | Pino/Winston | Overkill for frontend, Pino designed for Node.js not browser |

**Installation:**
```bash
npm install react-error-boundary @vercel/analytics @vercel/speed-insights
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    error/
      ErrorBoundary.tsx       # App-level error boundary wrapper
      ErrorFallback.tsx       # Generic error fallback UI
      RouteErrorFallback.tsx  # Route-specific error UI with navigation
  lib/
    logging/
      logger.ts               # Structured logging utility
  main.tsx                    # Analytics/SpeedInsights components added here
  App.tsx                     # Top-level ErrorBoundary wrapping routes
```

### Pattern 1: Layered Error Boundaries
**What:** Multiple error boundaries at different levels (app, route, widget)
**When to use:** Always - prevents entire app crash from single component error
**Example:**
```tsx
// Source: react-error-boundary v6 pattern
// src/App.tsx - App-level boundary
import { ErrorBoundary } from 'react-error-boundary'
import { ErrorFallback } from '@/components/error/ErrorFallback'

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, info) => {
        // Log to console with structured data
        console.error(JSON.stringify({
          level: 'error',
          type: 'react_error_boundary',
          error: error.message,
          stack: error.stack,
          componentStack: info.componentStack,
          timestamp: new Date().toISOString(),
        }))
      }}
    >
      <AuthProvider>
        <BrowserRouter>
          {/* Route-level boundaries inside */}
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
```

### Pattern 2: Resettable Error Boundaries for Routes
**What:** Error boundaries with reset capability tied to navigation
**When to use:** Wrap route components to allow retry after navigation
**Example:**
```tsx
// Source: react-error-boundary v6 pattern
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary'
import { useLocation } from 'react-router'

function RouteErrorFallback({ error, resetErrorBoundary }) {
  const location = useLocation()

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold text-text-primary mb-2">
          Something went wrong
        </h2>
        <p className="text-text-secondary mb-4">
          We encountered an unexpected error. Please try again.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-surface-elevated border border-surface-border rounded-lg hover:bg-surface-base"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  )
}

// Wrap each major route
<ErrorBoundary
  FallbackComponent={RouteErrorFallback}
  resetKeys={[location.pathname]}
  onReset={() => {
    // Clear any cached error state
  }}
>
  <TaxonomyPage />
</ErrorBoundary>
```

### Pattern 3: useErrorBoundary for Async Errors
**What:** Hook to manually trigger error boundary from async code
**When to use:** Event handlers, useEffect, async operations that error boundaries can't catch automatically
**Example:**
```tsx
// Source: react-error-boundary v6 pattern
import { useErrorBoundary } from 'react-error-boundary'

function DataComponent() {
  const { showBoundary } = useErrorBoundary()

  const handleFetch = async () => {
    try {
      const result = await supabase.from('items').select()
      if (result.error) throw result.error
    } catch (error) {
      // Propagate to nearest error boundary
      showBoundary(error)
    }
  }

  return <button onClick={handleFetch}>Load Data</button>
}
```

### Pattern 4: Vercel Analytics Integration
**What:** Page view and visitor tracking with custom events
**When to use:** Production monitoring, user behavior insights
**Example:**
```tsx
// Source: Vercel Analytics quickstart
// src/main.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </React.StrictMode>
)
```

### Pattern 5: Structured Logging Utility
**What:** JSON-formatted logging for easier parsing and filtering
**When to use:** All error logging, especially in Edge Functions
**Example:**
```typescript
// src/lib/logging/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  context?: Record<string, unknown>
  error?: {
    name: string
    message: string
    stack?: string
  }
}

export function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
  }

  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    }
  }

  // In production, structured JSON for log aggregation
  // In development, formatted for readability
  if (import.meta.env.PROD) {
    console[level](JSON.stringify(entry))
  } else {
    console[level](`[${level.toUpperCase()}] ${message}`, context || '', error || '')
  }
}

export const logger = {
  debug: (msg: string, ctx?: Record<string, unknown>) => log('debug', msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => log('info', msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => log('warn', msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>, err?: Error) => log('error', msg, ctx, err),
}
```

### Anti-Patterns to Avoid
- **Single app-wide error boundary:** If it triggers, entire app shows fallback - use layered approach
- **Catching errors in event handlers without propagating:** Error boundaries don't catch event handler errors automatically - use `useErrorBoundary` hook
- **Exposing stack traces to users:** Fallback UI should show friendly message, log stack trace separately
- **Heavy logging libraries in browser:** Pino/Winston designed for Node.js - use simple console + structure for browser
- **Ignoring async errors:** `try/catch` in effects/handlers should propagate to boundaries via `showBoundary`

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Error boundaries | Class component from scratch | react-error-boundary | Reset keys, hooks, render props - all implemented |
| Web vitals tracking | Manual Performance API | @vercel/speed-insights | Automatic CLS, LCP, FID collection |
| Uptime monitoring | Custom health check polling | UptimeRobot/Better Stack | Free tier sufficient, established alerting |
| Page view analytics | Custom tracking code | @vercel/analytics | Vercel native, privacy-compliant |
| Toast notifications | Alert() or custom toasts | sonner (already installed) | Already in project, styled consistently |

**Key insight:** Vercel's native observability tools integrate seamlessly with their hosting. Adding external tools (Sentry, Datadog) adds complexity without proportional benefit for this project's scale.

## Common Pitfalls

### Pitfall 1: Error Boundaries Don't Catch All Errors
**What goes wrong:** Event handlers, async code, and effects throw errors but boundary doesn't catch them
**Why it happens:** Error boundaries only catch errors during rendering, lifecycle methods, and constructors
**How to avoid:** Use `useErrorBoundary` hook to manually propagate errors from async code
**Warning signs:** Uncaught promise rejections in console, errors not showing fallback UI

### Pitfall 2: resetKeys Not Updating
**What goes wrong:** Error boundary stays in error state even after navigation
**Why it happens:** resetKeys array doesn't include changing values (like route path)
**How to avoid:** Include `location.pathname` in resetKeys, or relevant state that should trigger reset
**Warning signs:** User navigates away and back, still sees error fallback

### Pitfall 3: Logging Sensitive Data
**What goes wrong:** User emails, tenant IDs, or tokens logged in error context
**Why it happens:** Blindly spreading error objects or request bodies into logs
**How to avoid:** Explicitly pick safe fields for logging context, sanitize before logging
**Warning signs:** PII visible in Vercel logs or external log aggregators

### Pitfall 4: Analytics Not Tracking in Development
**What goes wrong:** Developer thinks analytics broken because no data in dashboard
**Why it happens:** Vercel Analytics only sends data in production (intentionally)
**How to avoid:** Deploy to preview/production to verify, or check Network tab for /_vercel/insights requests
**Warning signs:** Network tab shows no analytics requests locally (this is expected)

### Pitfall 5: Alert Fatigue from Low Thresholds
**What goes wrong:** Too many alerts for minor issues, team ignores real problems
**Why it happens:** Setting error rate threshold too low, or monitoring non-critical endpoints
**How to avoid:** Start with high thresholds (5% error rate), tune down based on baseline
**Warning signs:** Multiple alerts per day for the same issue

### Pitfall 6: Missing CORS for Error Logging Endpoints
**What goes wrong:** Frontend can't send logs to external service
**Why it happens:** Log aggregation service doesn't allow browser requests
**How to avoid:** Use Vercel-native logging (appears in Vercel logs automatically) or proxy through Edge Function
**Warning signs:** CORS errors when trying to send error telemetry

## Code Examples

Verified patterns from official sources and project context:

### Error Fallback Component
```tsx
// Source: react-error-boundary patterns + project styling
// src/components/error/ErrorFallback.tsx
import { AlertCircle, RefreshCw, Home } from 'lucide-react'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-surface-base flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-surface-elevated rounded-lg border border-surface-border p-8 text-center">
        <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-semibold text-text-primary mb-2">
          Something went wrong
        </h1>
        <p className="text-text-secondary mb-6">
          We encountered an unexpected error. Our team has been notified.
        </p>
        {import.meta.env.DEV && (
          <pre className="text-left text-xs text-red-400 bg-red-500/10 p-3 rounded mb-4 overflow-auto max-h-32">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={resetErrorBoundary}
            className="flex items-center gap-2 px-4 py-2 bg-accent-500 text-white rounded-lg hover:bg-accent-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-surface-base border border-surface-border rounded-lg hover:bg-surface-elevated transition-colors text-text-primary"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>
      </div>
    </div>
  )
}
```

### Main.tsx with Analytics
```tsx
// Source: Vercel Analytics quickstart + existing main.tsx structure
// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
    <SpeedInsights />
  </StrictMode>,
)
```

### Enhanced Edge Function Logging
```typescript
// Source: Existing send-invitation pattern enhanced with structure
// supabase/functions/[function-name]/index.ts

function logStructured(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    function: 'send-invitation', // Function name
    ...context,
  }
  console[level](JSON.stringify(entry))
}

serve(async (req) => {
  const requestId = crypto.randomUUID()

  logStructured('info', 'Function invoked', { requestId, method: req.method })

  try {
    // ... function logic

    logStructured('info', 'Request completed', { requestId, status: 200 })
    return new Response(...)
  } catch (error) {
    logStructured('error', 'Request failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### UptimeRobot Configuration (Manual Setup)
```
Monitor Type: HTTP(s)
URL: https://your-app.vercel.app
Friendly Name: RiskLytix Production
Monitoring Interval: 5 minutes (free tier)
Alert Contacts: Email, Slack webhook

Status Page (optional):
  - Create public status page
  - Add all critical endpoints
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class component error boundaries | react-error-boundary hooks | 2024+ | Functional API, better DX |
| Custom analytics tracking | Vercel Analytics native | 2023+ | Zero-config for Vercel deployments |
| Paid uptime monitoring | UptimeRobot free tier | Always available | 50 monitors free is sufficient for most apps |
| Console.log debugging | Structured JSON logging | 2024+ best practice | Easier filtering in Vercel logs |
| React.unstable_ErrorBoundary | react-error-boundary library | React 19 | Library provides better API than unstable native |

**Deprecated/outdated:**
- `componentDidCatch` only approach: Use react-error-boundary for functional API
- Manual Performance API for vitals: Use @vercel/speed-insights
- Vercel Monitoring (standalone): Sunset Nov 2025, use Observability Plus or free tier

## Open Questions

Things that couldn't be fully resolved:

1. **Sentry vs Vercel-native error tracking**
   - What we know: Sentry provides deeper error analytics, stack traces, session replay
   - What's unclear: Is the added complexity worth it for this project's scale?
   - Recommendation: Start with react-error-boundary + console logging, add Sentry later if needed

2. **Log retention requirements**
   - What we know: Vercel Pro has 1-day log retention, Observability Plus extends to 30 days
   - What's unclear: Are there compliance requirements for longer retention?
   - Recommendation: Vercel Pro default sufficient for MVP, upgrade to Observability Plus if retention needed

3. **Alerting thresholds**
   - What we know: Need to alert on error rate spikes and downtime
   - What's unclear: What's the baseline error rate? What threshold is actionable?
   - Recommendation: Start with 5% error rate threshold, adjust based on observed baseline after 1 week

## Sources

### Primary (HIGH confidence)
- [react-error-boundary GitHub](https://github.com/bvaughn/react-error-boundary) - v6.1.0 API, patterns
- [Vercel Analytics Quickstart](https://vercel.com/docs/analytics/quickstart) - Setup instructions
- [Vercel Speed Insights](https://vercel.com/docs/speed-insights/quickstart) - Core Web Vitals tracking
- [Vercel Observability Plus](https://vercel.com/docs/observability/observability-plus) - Pricing, features, limitations
- Existing codebase: send-invitation Edge Function logging pattern

### Secondary (MEDIUM confidence)
- [Vercel Monitoring Changelog](https://vercel.com/blog/introducing-monitoring) - Monitoring features
- [UptimeRobot](https://uptimerobot.com/) - Free tier limits, alerting options
- [Loggly React Logging Best Practices](https://www.loggly.com/blog/best-practices-for-client-side-logging-and-error-handling-in-react/) - Client-side logging patterns

### Tertiary (LOW confidence)
- WebSearch results for React 19 error boundary integration (verified against react-error-boundary docs)
- WebSearch results for structured logging patterns (general consensus, not library-specific)

## Metadata

**Confidence breakdown:**
- Error boundaries: HIGH - react-error-boundary v6 docs clear, patterns established
- Vercel Analytics/Speed Insights: HIGH - official Vercel documentation
- Logging patterns: MEDIUM - no single "right" answer, patterns are project-dependent
- Alerting setup: MEDIUM - free tier options verified, threshold tuning needs baseline data

**Research date:** 2026-01-26
**Valid until:** 60 days (stable domain, mature libraries, Vercel features established)
