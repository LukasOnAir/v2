import { Outlet } from 'react-router'
import { TesterHeader } from './TesterHeader'

export function TesterLayout() {
  return (
    <div className="h-screen flex flex-col bg-surface-base">
      <TesterHeader />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
