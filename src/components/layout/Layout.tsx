import { Outlet } from 'react-router'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { ImpersonationBanner } from '@/components/admin/ImpersonationBanner'

export function Layout() {
  return (
    <div className="h-screen flex flex-col bg-surface-base">
      <ImpersonationBanner />
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
