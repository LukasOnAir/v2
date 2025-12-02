import { useState } from 'react'
import { NavLink } from 'react-router'
import { Folders, Table, Grid3x3, Sun, ClipboardList, History, BarChart3, BookOpen, Shield, Ticket, CheckCircle2, ClipboardCheck, Users, type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'
import { useApprovalStore } from '@/stores/approvalStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { usePermissions } from '@/hooks/usePermissions'
import { usePendingCount } from '@/hooks/usePendingChanges'

// Permission key type for nav item filtering
type PermissionKey = keyof ReturnType<typeof usePermissions>

interface NavItem {
  to: string
  icon: LucideIcon
  label: string
  permission?: PermissionKey
}

const navItems: NavItem[] = [
  { to: '/taxonomy', icon: Folders, label: 'Taxonomies', permission: 'canViewTaxonomies' },
  { to: '/rct', icon: Table, label: 'Risk Control Table', permission: 'canViewRCT' },
  { to: '/controls', icon: Shield, label: 'Controls', permission: 'canViewControlsHub' },
  { to: '/matrix', icon: Grid3x3, label: 'Matrix', permission: 'canViewMatrix' },
  { to: '/sunburst', icon: Sun, label: 'Sunburst', permission: 'canViewSunburst' },
  { to: '/remediation', icon: ClipboardList, label: 'Remediation', permission: 'canViewRemediation' },
  { to: '/tickets', icon: Ticket, label: 'Tickets', permission: 'canViewTickets' },
  { to: '/audit', icon: History, label: 'Audit Trail', permission: 'canViewAudit' },
  { to: '/approval', icon: CheckCircle2, label: 'Approvals', permission: 'canViewApproval' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics', permission: 'canViewAnalytics' },
  { to: '/knowledge-base', icon: BookOpen, label: 'Knowledge Base', permission: 'canViewKnowledgeBase' },
  { to: '/users', icon: Users, label: 'User Management', permission: 'canViewUserManagement' },
]

export function Sidebar() {
  const [isHovered, setIsHovered] = useState(false)
  const permissions = usePermissions()
  const { isManager, isControlTester, isDemoMode } = permissions
  const isLargeScreen = useMediaQuery('(min-width: 1024px)')

  // Dual-source: Store (demo) vs Database (authenticated)
  const storePendingCount = useApprovalStore((state) => state.getPendingCount())
  const { data: dbPendingCount } = usePendingCount()
  const pendingCount = isDemoMode ? storePendingCount : (dbPendingCount ?? 0)

  // Collapsed by default, expands on hover
  const isCollapsed = !isLargeScreen || !isHovered

  return (
    <aside
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={clsx(
        'h-full bg-surface-elevated border-r border-surface-border flex flex-col transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {/* Control Tester only sees "My Controls" link */}
          {isControlTester && (
            <li>
              <NavLink
                to="/tester"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150',
                    'hover:bg-surface-overlay hover:scale-[1.02]',
                    isActive
                      ? 'bg-accent-500/10 text-accent-500'
                      : 'text-text-secondary hover:text-text-primary'
                  )
                }
              >
                <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && (
                  <span className="text-sm font-medium truncate flex-1">My Controls</span>
                )}
              </NavLink>
            </li>
          )}

          {/* Other roles see filtered nav items based on permissions */}
          {navItems
            .filter((item) => !item.permission || permissions[item.permission])
            .map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150',
                      'hover:bg-surface-overlay hover:scale-[1.02]',
                      isActive
                        ? 'bg-accent-500/10 text-accent-500'
                        : 'text-text-secondary hover:text-text-primary'
                    )
                  }
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <span className="text-sm font-medium truncate flex-1">{item.label}</span>
                  )}
                  {/* Pending count badge for Approvals */}
                  {item.to === '/approval' && isManager && pendingCount > 0 && (
                    <span className="bg-amber-500 text-white text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {pendingCount > 99 ? '99+' : pendingCount}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
        </ul>
      </nav>
    </aside>
  )
}
