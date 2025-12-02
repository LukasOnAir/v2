# Phase 18: Login Page - Research

**Researched:** 2026-01-24
**Domain:** React animations, demo authentication, dark theme login UI
**Confidence:** HIGH

## Summary

This phase implements a demo login page for the Holland Casino risk management application. Since this is a demo (not real authentication), the focus is on creating a visually impressive, eye-catching interface with smooth animations rather than security concerns.

The codebase already has:
- Role-based "demo mode" in `uiStore.ts` with role picker in Header
- Dark theme with amber/orange accents (Holland Casino branding)
- Tailwind CSS with custom surface/accent color palette
- React Router 7 with nested routes under a Layout component
- Zustand for state management with localStorage persistence

**Primary recommendation:** Use Motion (formerly Framer Motion) for animations - it's the standard for React animations, integrates well with Tailwind, and handles enter/exit animations that CSS cannot. Add a simple `isAuthenticated` flag to uiStore and a ProtectedRoute wrapper.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| motion | 11.x | React animations | Industry standard, 12M+ monthly npm downloads, declarative API |
| react-router | 7.x (existing) | Routing & redirects | Already in codebase, supports protected routes pattern |
| zustand | 5.x (existing) | Auth state | Already in codebase with localStorage persistence |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx | 2.x (existing) | Class composition | Already used throughout codebase |
| lucide-react | (existing) | Icons | Already used, has Lock, User, Eye icons |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Motion | CSS-only animations | CSS lacks exit animations, gesture handling, spring physics |
| Motion | react-spring | Spring-focused, steeper learning curve, less documentation |
| Motion | GSAP | More powerful but larger bundle, imperative API |

**Installation:**
```bash
npm install motion
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── pages/
│   └── LoginPage.tsx          # New login page component
├── components/
│   └── auth/
│       └── ProtectedRoute.tsx  # Route guard component
├── stores/
│   └── uiStore.ts              # Extend with isAuthenticated state
└── App.tsx                     # Add login route, wrap with ProtectedRoute
```

### Pattern 1: Protected Route Wrapper

**What:** A component that checks auth state and redirects unauthorized users
**When to use:** Wrapping routes that require authentication
**Example:**
```typescript
// Source: https://www.robinwieruch.de/react-router-private-routes/
import { Navigate, Outlet, useLocation } from 'react-router'
import { useUIStore } from '@/stores/uiStore'

export function ProtectedRoute() {
  const isAuthenticated = useUIStore((state) => state.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    // Remember where user was trying to go
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
```

### Pattern 2: Motion Animation with Tailwind

**What:** Combine Framer Motion for animation logic with Tailwind for styling
**When to use:** Any animated component in this codebase
**Example:**
```typescript
// Source: https://dev.to/manukumar07/framer-motion-tailwind-the-2025-animation-stack-1801
import { motion } from 'motion/react'

<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  className="px-6 py-3 bg-accent-500 text-white rounded-lg font-medium"
>
  Sign In
</motion.button>
```

### Pattern 3: Page Enter Animation

**What:** Animate page content on mount for premium feel
**When to use:** Login page initial render
**Example:**
```typescript
import { motion } from 'motion/react'

<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5, ease: 'easeOut' }}
>
  {/* Login form content */}
</motion.div>
```

### Pattern 4: Staggered Children Animation

**What:** Animate form fields one by one for visual interest
**When to use:** Login form fields appearing in sequence
**Example:**
```typescript
import { motion } from 'motion/react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

<motion.form variants={containerVariants} initial="hidden" animate="visible">
  <motion.div variants={itemVariants}>
    <input type="text" placeholder="Username" />
  </motion.div>
  <motion.div variants={itemVariants}>
    <input type="password" placeholder="Password" />
  </motion.div>
  <motion.button variants={itemVariants}>
    Sign In
  </motion.button>
</motion.form>
```

### Anti-Patterns to Avoid
- **True black backgrounds:** Don't use #000000 - use #0a0a0a or #121212 (codebase already follows this)
- **Overly long animations:** Keep under 500ms for UI interactions - users will perceive lag
- **Animation on every element:** Be selective - animate what draws attention (form, button)
- **CSS transitions for exits:** CSS cannot animate elements leaving DOM - use Motion's AnimatePresence

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enter/exit animations | CSS animation + JS class toggle | Motion AnimatePresence | CSS cannot animate DOM removal |
| Spring physics | Custom easing functions | Motion spring transition | Physics-based feels more natural |
| Gesture animations | mouseenter/mouseleave handlers | Motion whileHover/whileTap | Handles touch, keyboard, accessibility |
| Loading states | Custom spinner | Existing Tailwind + animate-spin | Already available in Tailwind |

**Key insight:** CSS transitions handle simple hover effects fine (and codebase uses them). Motion adds value for: enter/exit animations, staggered sequences, spring physics, gesture handling. Use the right tool for each job.

## Common Pitfalls

### Pitfall 1: Importing from wrong package
**What goes wrong:** Import errors after installing `motion`
**Why it happens:** Package renamed from `framer-motion` to `motion` in v11
**How to avoid:** Import from `motion/react`, not `framer-motion`
**Warning signs:** "Module not found" or "framer-motion is not defined"

### Pitfall 2: Animation blocking form submission
**What goes wrong:** Form submits before exit animation completes
**Why it happens:** DOM removal happens immediately, animation gets cut off
**How to avoid:** Use AnimatePresence with `mode="wait"` if needed, or don't animate form exit
**Warning signs:** Abrupt visual changes when navigating after login

### Pitfall 3: Layout shift during animation
**What goes wrong:** Page jumps when animated elements appear
**Why it happens:** Element takes up space suddenly
**How to avoid:** Use `opacity` + `transform` instead of `height`/`width` animations
**Warning signs:** Content below animated elements shifts

### Pitfall 4: Not using existing theme colors
**What goes wrong:** Login page looks disconnected from app
**Why it happens:** Using hardcoded colors instead of Tailwind theme
**How to avoid:** Use `bg-surface-base`, `bg-surface-elevated`, `text-accent-500`, etc.
**Warning signs:** Colors don't match when switching between login and app

### Pitfall 5: Overcomplicating demo auth
**What goes wrong:** Building JWT validation, secure storage for demo
**Why it happens:** Developer instinct to "do it right"
**How to avoid:** This is demo mode - simple boolean + localStorage is fine
**Warning signs:** Spending time on auth concerns for a demo

## Code Examples

Verified patterns from official sources:

### Basic Form Input with Focus Animation
```typescript
// Source: Motion docs + existing codebase patterns
import { motion } from 'motion/react'
import { useState } from 'react'

function AnimatedInput({ label, type, ...props }) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <motion.div
      animate={{
        scale: isFocused ? 1.02 : 1,
        borderColor: isFocused ? 'var(--color-accent-500)' : 'var(--color-surface-border)'
      }}
      transition={{ duration: 0.2 }}
      className="relative"
    >
      <label className="block text-sm font-medium text-text-secondary mb-1">
        {label}
      </label>
      <input
        type={type}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="w-full px-4 py-3 bg-surface-base border border-surface-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
        {...props}
      />
    </motion.div>
  )
}
```

### Animated Submit Button with Loading State
```typescript
// Source: Motion docs + existing codebase button patterns
import { motion } from 'motion/react'
import { Loader2 } from 'lucide-react'

function SubmitButton({ isLoading, children }) {
  return (
    <motion.button
      type="submit"
      disabled={isLoading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="w-full px-6 py-3 bg-accent-500 text-white rounded-lg font-medium hover:bg-accent-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Signing in...
        </>
      ) : (
        children
      )}
    </motion.button>
  )
}
```

### Demo Credentials Display
```typescript
// Show demo credentials prominently - this is for demo, not security
<div className="p-4 bg-accent-500/10 border border-accent-500/30 rounded-lg">
  <p className="text-sm text-text-secondary mb-2">Demo Credentials:</p>
  <p className="text-text-primary font-mono">
    Username: <span className="text-accent-400">demo</span>
  </p>
  <p className="text-text-primary font-mono">
    Password: <span className="text-accent-400">demo</span>
  </p>
</div>
```

### uiStore Extension for Auth
```typescript
// Extend existing uiStore.ts
interface UIState {
  // ... existing state

  // Demo auth (simple boolean, not real security)
  isAuthenticated: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // ... existing state

      isAuthenticated: false,
      login: (username, password) => {
        // Demo credentials - not real auth
        if (username === 'demo' && password === 'demo') {
          set({ isAuthenticated: true })
          return true
        }
        return false
      },
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'riskguard-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

### App.tsx Route Structure
```typescript
// Pattern for protected routes with login
<BrowserRouter>
  <Routes>
    {/* Login route - outside protected area */}
    <Route path="login" element={<LoginPage />} />

    {/* Protected routes wrapped with ProtectedRoute */}
    <Route element={<ProtectedRoute />}>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/taxonomy" replace />} />
        {/* ... existing routes */}
      </Route>
    </Route>
  </Routes>
</BrowserRouter>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| framer-motion package | motion package | 2024 (v11) | Import from 'motion/react' now |
| CSS animations only | Motion + Tailwind combo | 2024-2025 | Industry standard for React |
| Complex auth for demos | Simple state + localStorage | N/A | Appropriate for demo context |

**Deprecated/outdated:**
- `framer-motion` package name: Use `motion` instead
- Importing from `framer-motion`: Import from `motion/react`

## Open Questions

Things that couldn't be fully resolved:

1. **Background visual effect**
   - What we know: Dark themes often use subtle gradients, animated particles, or glassmorphism
   - What's unclear: Exact visual style preferred for Holland Casino branding
   - Recommendation: Start with subtle gradient + floating particles, can adjust based on feedback

2. **Logo placement**
   - What we know: Holland Casino branding uses amber/orange
   - What's unclear: Whether there's an actual logo asset to use
   - Recommendation: Use text "RiskGuard ERM" with accent color, same as Header

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `uiStore.ts`, `App.tsx`, `Header.tsx`, `index.css`
- Motion official documentation: https://motion.dev/docs

### Secondary (MEDIUM confidence)
- Robin Wieruch React Router 7 protected routes: https://www.robinwieruch.de/react-router-private-routes/
- DEV.to Framer Motion + Tailwind guide: https://dev.to/manukumar07/framer-motion-tailwind-the-2025-animation-stack-1801
- Motion npm package: https://www.npmjs.com/package/framer-motion

### Tertiary (LOW confidence)
- WebSearch results for dark theme login patterns (multiple sources)
- WebSearch results for animation comparison (verified with official Motion docs)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Motion is industry standard, verified with npm stats and official docs
- Architecture: HIGH - Based on existing codebase patterns and React Router official patterns
- Pitfalls: MEDIUM - Based on community resources and general React animation knowledge

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable technology)
