import { ReactNode } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useLocation } from 'react-router'
import { ErrorFallback } from './ErrorFallback'

interface RouteErrorBoundaryProps {
  children: ReactNode
}

export function RouteErrorBoundary({ children }: RouteErrorBoundaryProps) {
  const location = useLocation()

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      resetKeys={[location.pathname]}
      onError={(error, info) => {
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
      {children}
    </ErrorBoundary>
  )
}
