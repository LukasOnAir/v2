import { useAuth } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/uiStore'
import { useEffectiveTenant } from '@/hooks/useEffectiveTenant'
import {
  Role,
  ROLES,
  isDirectorRole,
  isManagerRole,
  isRiskManagerRole
} from '@/lib/permissions'

/**
 * Role-based permissions hook
 *
 * In production: Uses role from AuthContext (JWT app_metadata)
 * In demo mode: Uses selectedRole from uiStore (role selector)
 * When impersonating: Uses effectiveRole from impersonation context
 *
 * Role hierarchy (most to least permissions):
 * Director > Manager > Risk Manager > Control Owner > Control Tester
 */
export function usePermissions() {
  const { role: authRole } = useAuth()
  const { effectiveRole, isImpersonating } = useEffectiveTenant()
  const selectedRole = useUIStore((state) => state.selectedRole)

  // Use real auth role in production, fall back to selectedRole for demo
  // Demo mode detected when no authenticated role (user not logged in or no role assigned)
  const isDemoMode = !authRole

  // When impersonating with a profile selected, use the impersonated profile's role
  // This ensures super-admin sees exactly what the impersonated user would see
  const role = (isImpersonating && effectiveRole
    ? effectiveRole
    : (isDemoMode ? selectedRole : authRole)) as Role | null

  const isDirector = isDirectorRole(role)
  const isManager = isManagerRole(role)  // Director inherits Manager
  const isRiskManager = isRiskManagerRole(role)  // Manager inherits Risk Manager
  const isControlOwner = role === ROLES.CONTROL_OWNER
  const isControlTester = role === ROLES.CONTROL_TESTER

  return {
    // === Director-only permissions (USER MANAGEMENT) ===
    canInviteUsers: isDirector,
    canDeactivateUsers: isDirector,
    canAssignRoles: isDirector,
    canViewUserList: isDirector,

    // === Edit permissions - Risk Manager and above ===
    canEditGrossScores: isRiskManager,
    canEditNetScores: isRiskManager,
    canEditControlDefinitions: isRiskManager,
    canEditControlAssessments: isRiskManager,
    canEditTaxonomies: isRiskManager,
    canManageCustomColumns: isRiskManager,
    canEditCustomColumnValues: isRiskManager,

    // === View permissions - Tester most restricted ===
    canViewAll: !isControlTester,

    // === Change request - Control Owner only ===
    canSubmitChangeRequests: isControlOwner,

    // === Test-related permissions ===
    canRecordTestResults: true,  // All roles including tester
    canEditTestSchedule: isRiskManager,
    canViewTestHistory: true,

    // === Manager-only permissions (four-eye approval) ===
    canApproveChanges: isManager,
    canRejectChanges: isManager,
    canToggleFourEye: isManager,
    canRegenerateRCT: isManager,

    // === Page visibility (Control Tester sees only My Controls) ===
    isControlTester,
    canViewTaxonomies: !isControlTester,
    canViewRCT: !isControlTester,
    canViewControlsHub: !isControlTester,
    canViewMatrix: !isControlTester,
    canViewSunburst: !isControlTester,
    canViewRemediation: !isControlTester,
    canViewTickets: !isControlTester,
    canViewAudit: !isControlTester,
    canViewApproval: isManager,
    canViewAnalytics: !isControlTester,
    canViewKnowledgeBase: !isControlTester,
    canViewUserManagement: isDirector,  // NEW: Director-only admin page

    // === Profile permissions ===
    canEditOwnProfile: true,  // All users can edit their own name/password

    // === Utility ===
    role,
    isDirector,
    isManager,
    isRiskManager,
    isControlOwner,
    isDemoMode,
  }
}
