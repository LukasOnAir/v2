import { Loader2 } from 'lucide-react'
import { TicketsDashboard } from '@/components/tickets'
import { useTickets, useTicketEntityLinks } from '@/hooks/useTickets'
import { useIsDemoMode } from '@/hooks/useTenantData'

/**
 * Tickets dashboard page route
 */
export function TicketsPage() {
  const isDemoMode = useIsDemoMode()

  // Database hooks (only active when authenticated)
  const { data: dbTickets, isLoading: ticketsLoading } = useTickets()
  const { data: dbLinks, isLoading: linksLoading } = useTicketEntityLinks()

  // Loading state (only when authenticated)
  if (!isDemoMode && (ticketsLoading || linksLoading)) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <TicketsDashboard
        isDemoMode={isDemoMode}
        dbTickets={dbTickets || []}
        dbLinks={dbLinks || []}
      />
    </div>
  )
}
