# Phase 1: Foundation - Research

**Researched:** 2026-01-19
**Domain:** React application scaffolding, dark theme UI, state management, persistence
**Confidence:** HIGH

## Summary

This phase establishes the foundation for RiskGuard ERM: a Vite-powered React 19 application with TypeScript, Tailwind CSS v4 for dark-themed styling, Zustand for state management with LocalStorage persistence, and React Router v7 for navigation between views.

The technology stack is well-established with excellent documentation. React 19 brings the React Compiler for automatic optimizations, eliminating most useMemo/useCallback needs. Tailwind CSS v4 introduces a CSS-first configuration approach with the `@theme` directive and `@tailwindcss/vite` plugin for zero-config integration. Zustand 5 offers a minimal API with built-in persist middleware that handles LocalStorage automatically. React Router v7 provides declarative routing suitable for the three-view structure (Taxonomies, RCT, Matrix).

**Primary recommendation:** Use the standard Vite + React + TypeScript template, add Tailwind CSS v4 via the Vite plugin, configure Zustand with persist middleware for automatic state hydration, and implement class-based dark mode with `@custom-variant` for consistent theming.

## Standard Stack

The established libraries/tools for this domain:

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.x | UI framework | Latest stable with React Compiler, auto-batching |
| TypeScript | 5.x | Type safety | Industry standard for React projects |
| Vite | 7.x | Build tool | Fastest DX, native ES modules, excellent plugin ecosystem |
| Tailwind CSS | 4.x | Styling | CSS-first config, dark mode built-in, zero-runtime |
| Zustand | 5.x | State management | Minimal boilerplate, built-in persist middleware |
| React Router | 7.x | Navigation | Standard React routing, declarative mode sufficient |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 0.5x | Icons | Sidebar navigation icons, UI indicators |
| clsx | 2.x | Conditional classes | Cleaner className composition |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zustand | Redux Toolkit | Redux adds boilerplate; Zustand simpler for this scope |
| Zustand | Jotai | Jotai atom-based; Zustand store-based better for persist |
| Tailwind | CSS Modules | Tailwind faster iteration, dark mode built-in |
| React Router | TanStack Router | React Router simpler for three-view app |

**Installation:**
```bash
# Create project
npm create vite@latest riskguard-erm -- --template react-ts

# Core dependencies
npm install zustand react-router lucide-react clsx

# Tailwind CSS v4 (Vite plugin)
npm install tailwindcss @tailwindcss/vite
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/          # Shared UI components
│   ├── layout/          # Layout components (Sidebar, Header)
│   └── ui/              # Reusable primitives (Button, Card)
├── features/            # Feature-based modules (future phases)
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
│   ├── uiStore.ts       # UI state (sidebar, theme)
│   └── index.ts         # Store exports
├── pages/               # Route page components
│   ├── TaxonomyPage.tsx
│   ├── RCTPage.tsx
│   └── MatrixPage.tsx
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── App.tsx              # Root component with routing
├── main.tsx             # Entry point
└── index.css            # Tailwind import + theme config
```

### Pattern 1: Zustand Store with Persist Middleware

**What:** Create typed stores with automatic LocalStorage persistence
**When to use:** Any state that should survive browser refresh

```typescript
// Source: https://zustand.docs.pmnd.rs/middlewares/persist
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),
    }),
    {
      name: 'riskguard-ui', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

### Pattern 2: Tailwind v4 Dark Theme with CSS Variables

**What:** CSS-first theme configuration with class-based dark mode
**When to use:** Application-wide theming

```css
/* Source: https://tailwindcss.com/docs/dark-mode */
@import "tailwindcss";

/* Enable class-based dark mode */
@custom-variant dark (&:where(.dark, .dark *));

/* Define theme colors */
@theme {
  /* Surface colors */
  --color-surface-base: #0a0a0a;
  --color-surface-elevated: #121212;
  --color-surface-overlay: #1a1a1a;

  /* Amber accent (Holland Casino) */
  --color-accent: oklch(0.769 0.188 70.08); /* amber-500 */
  --color-accent-hover: oklch(0.666 0.179 58.318); /* amber-600 */

  /* Text hierarchy */
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
}
```

### Pattern 3: React Router Declarative Setup

**What:** Simple declarative routing for SPA views
**When to use:** Basic page navigation without data loading

```typescript
// Source: https://reactrouter.com/
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { Layout } from './components/layout/Layout'
import { TaxonomyPage } from './pages/TaxonomyPage'
import { RCTPage } from './pages/RCTPage'
import { MatrixPage } from './pages/MatrixPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Navigate to="/taxonomy" replace />} />
          <Route path="taxonomy" element={<TaxonomyPage />} />
          <Route path="rct" element={<RCTPage />} />
          <Route path="matrix" element={<MatrixPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### Pattern 4: Collapsible Sidebar with Responsive Behavior

**What:** Left sidebar that auto-collapses based on screen size
**When to use:** App shell with primary navigation

```typescript
// Component structure with Zustand state
import { useUIStore } from '@/stores/uiStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()
  const isLargeScreen = useMediaQuery('(min-width: 1024px)')

  // Auto-collapse on small screens
  const isCollapsed = !isLargeScreen || sidebarCollapsed

  return (
    <aside className={cn(
      'h-screen bg-surface-elevated transition-all duration-200',
      isCollapsed ? 'w-16' : 'w-64'
    )}>
      {/* Navigation items */}
    </aside>
  )
}
```

### Anti-Patterns to Avoid

- **Global state for everything:** Only persist what needs to survive refresh (sidebar state, selected role). Keep transient UI state local.
- **CSS-in-JS with Tailwind:** Use Tailwind utilities directly; don't mix styled-components or emotion.
- **Complex routing:** Use declarative mode; data/framework modes add unnecessary complexity for this app.
- **Provider wrapping:** Zustand doesn't need providers; avoid Context API for state that Zustand handles.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| LocalStorage sync | Custom serialization | Zustand persist middleware | Handles hydration, versioning, migrations |
| Icon system | Custom SVG components | lucide-react | Tree-shakable, TypeScript types, consistent style |
| Responsive detection | Manual window listeners | CSS media queries + Tailwind | CSS handles this natively |
| Dark mode toggle | Custom CSS variable manipulation | Tailwind class-based dark mode | Framework handles all utilities |
| Loading skeletons | Custom animation CSS | Tailwind animate-pulse | Built-in, accessible |

**Key insight:** Tailwind v4 and Zustand both provide battle-tested solutions for theming and persistence. Custom implementations introduce edge cases (hydration timing, storage quotas, SSR issues) that these libraries already handle.

## Common Pitfalls

### Pitfall 1: Zustand Hydration Flash

**What goes wrong:** UI shows default state briefly before localStorage data loads
**Why it happens:** Zustand persist middleware uses async storage by default
**How to avoid:** LocalStorage is synchronous; hydration completes during store creation. No special handling needed.
**Warning signs:** Flicker on page load showing wrong sidebar state

### Pitfall 2: Tailwind v4 Config Migration

**What goes wrong:** Using `tailwind.config.js` patterns from v3
**Why it happens:** v4 uses CSS-first `@theme` directive, not JavaScript config
**How to avoid:** Use `@theme` in CSS for colors, `@custom-variant` for dark mode. No tailwind.config.js needed.
**Warning signs:** "Unknown at rule @theme" errors, config not applying

### Pitfall 3: Over-engineering State

**What goes wrong:** Putting modal open/close, form inputs in global store
**Why it happens:** Habit from Redux patterns
**How to avoid:** Only put in Zustand: (1) data that persists across sessions, (2) state shared between distant components. Use local useState for the rest.
**Warning signs:** Store has 20+ fields, most for single-component use

### Pitfall 4: Missing Dark Class on Root

**What goes wrong:** Dark mode utilities don't apply
**Why it happens:** Forgot to add `dark` class to `<html>` element
**How to avoid:** Always apply dark class to root element for dark-first apps
**Warning signs:** All `dark:` utilities ignored, light theme shows

### Pitfall 5: Transition Performance

**What goes wrong:** Janky animations on sidebar collapse
**Why it happens:** Animating width causes layout recalculation
**How to avoid:** Use `transition-all duration-200` with transform where possible. For width, keep duration short (150-200ms).
**Warning signs:** Visible stutter during sidebar toggle

## Code Examples

Verified patterns from official sources:

### Vite Config with Tailwind v4

```typescript
// vite.config.ts
// Source: https://tailwindcss.com/docs/installation/using-vite
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

### Complete CSS Theme Setup

```css
/* src/index.css */
/* Source: https://tailwindcss.com/docs/dark-mode */
@import "tailwindcss";

/* Class-based dark mode (always dark for this app) */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Surface colors - very dark backgrounds */
  --color-surface-base: #0a0a0a;
  --color-surface-elevated: #121212;
  --color-surface-overlay: #1a1a1a;
  --color-surface-border: #27272a;

  /* Amber accent palette (Holland Casino brand) */
  --color-accent-50: oklch(0.987 0.022 95.277);
  --color-accent-100: oklch(0.962 0.059 95.617);
  --color-accent-200: oklch(0.924 0.12 95.746);
  --color-accent-300: oklch(0.879 0.169 91.605);
  --color-accent-400: oklch(0.828 0.189 84.429);
  --color-accent-500: oklch(0.769 0.188 70.08);
  --color-accent-600: oklch(0.666 0.179 58.318);
  --color-accent-700: oklch(0.555 0.163 48.998);
  --color-accent-800: oklch(0.473 0.137 46.201);
  --color-accent-900: oklch(0.414 0.112 45.904);

  /* Text colors */
  --color-text-primary: #fafafa;
  --color-text-secondary: #a1a1aa;
  --color-text-muted: #71717a;
}

/* Base styles */
@layer base {
  html {
    @apply bg-surface-base text-text-primary;
  }

  body {
    @apply antialiased;
  }
}
```

### Zustand Store with TypeScript and Persist

```typescript
// src/stores/uiStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface UIState {
  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void

  // Role (demo mode)
  selectedRole: 'risk-manager' | 'control-owner'
  setSelectedRole: (role: 'risk-manager' | 'control-owner') => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({
        sidebarCollapsed: !state.sidebarCollapsed
      })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

      selectedRole: 'risk-manager',
      setSelectedRole: (role) => set({ selectedRole: role }),
    }),
    {
      name: 'riskguard-ui',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
```

### Hover Effect Button Component

```typescript
// src/components/ui/Button.tsx
import { clsx } from 'clsx'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  children: React.ReactNode
}

export function Button({
  variant = 'secondary',
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        // Base styles
        'inline-flex items-center justify-center rounded-md px-4 py-2',
        'text-sm font-medium',
        'transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 focus:ring-offset-surface-base',
        // Hover scale effect
        'hover:scale-[1.02] active:scale-[0.98]',
        // Variants
        {
          'bg-accent-500 text-surface-base hover:bg-accent-600': variant === 'primary',
          'bg-surface-elevated text-text-primary hover:bg-surface-overlay': variant === 'secondary',
          'bg-transparent text-text-secondary hover:bg-surface-elevated hover:text-text-primary': variant === 'ghost',
        },
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}
```

### Skeleton Loading Component

```typescript
// src/components/ui/Skeleton.tsx
import { clsx } from 'clsx'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded-md bg-surface-overlay',
        className
      )}
    />
  )
}

// Usage examples:
// <Skeleton className="h-4 w-32" />  // Text line
// <Skeleton className="h-8 w-full" /> // Full width bar
// <Skeleton className="h-64 w-full" /> // Content block
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| tailwind.config.js | @theme in CSS | Tailwind v4 (2025) | Zero-config, CSS-first |
| @tailwind directives | @import "tailwindcss" | Tailwind v4 (2025) | Single import |
| PostCSS config | @tailwindcss/vite plugin | Tailwind v4 (2025) | Simplified setup |
| useMemo/useCallback | React Compiler | React 19 (2024) | Automatic optimization |
| create(...) without types | create<State>()(...) | Zustand 4+ | Required for TypeScript |

**Deprecated/outdated:**
- `tailwind.config.js` for color customization: Use `@theme` directive in CSS
- `@tailwind base/components/utilities`: Use `@import "tailwindcss"`
- Manual memoization in React 19: Compiler handles this automatically

## Open Questions

Things that couldn't be fully resolved:

1. **Vite 7.3 exact template output**
   - What we know: Template creates standard React + TS structure
   - What's unclear: Exact file contents may vary between 7.x versions
   - Recommendation: Accept template defaults, customize from there

2. **React 19.2 Compiler opt-in**
   - What we know: Compiler available, reduces re-renders 25-40%
   - What's unclear: Whether Vite template enables it by default
   - Recommendation: Verify after scaffolding; add if not present

## Sources

### Primary (HIGH confidence)
- [Tailwind CSS v4 Dark Mode](https://tailwindcss.com/docs/dark-mode) - Theme configuration, @custom-variant
- [Tailwind CSS v4 Installation with Vite](https://tailwindcss.com/docs/installation/using-vite) - Setup steps
- [Tailwind CSS v4 Colors](https://tailwindcss.com/docs/customizing-colors) - @theme directive, amber palette
- [Zustand persist middleware](https://zustand.docs.pmnd.rs/middlewares/persist) - LocalStorage integration
- [React Router v7](https://reactrouter.com/) - Declarative routing
- [Vite Getting Started](https://vite.dev/guide/) - Project scaffolding

### Secondary (MEDIUM confidence)
- [React 19.2 Release Blog](https://react.dev/blog/2025/10/01/react-19-2) - Compiler, new features
- [Lucide React](https://lucide.dev/guide/packages/lucide-react) - Icon library
- [Zustand GitHub](https://github.com/pmndrs/zustand) - Store patterns

### Tertiary (LOW confidence)
- Various Medium articles on folder structure - Community patterns, not official
- DEV.to tutorials on Tailwind v4 setup - Helpful but verify with official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries have official documentation, versions verified
- Architecture: HIGH - Patterns from official docs and established community practice
- Pitfalls: MEDIUM - Based on community reports and common issues

**Research date:** 2026-01-19
**Valid until:** 2026-02-19 (30 days - stack is stable)

---
*Phase: 01-foundation*
*Research completed: 2026-01-19*
