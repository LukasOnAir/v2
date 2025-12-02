/**
 * Role-based permission constants
 *
 * Role Hierarchy (most to least permissions):
 * Director > Manager > Risk Manager > Control Owner > Control Tester
 *
 * Director: Full organization management (users, roles) + Manager permissions
 * Manager: Approval authority + Risk Manager permissions
 * Risk Manager: Full ERM access (edit all entities)
 * Control Owner: View-only + can submit change requests
 * Control Tester: Most restricted - only assigned tests
 */

export const ROLES = {
  DIRECTOR: 'director',
  MANAGER: 'manager',
  RISK_MANAGER: 'risk-manager',
  CONTROL_OWNER: 'control-owner',
  CONTROL_TESTER: 'control-tester',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

// Roles that can be assigned to invited users (Director excluded - bootstrap only)
export const INVITABLE_ROLES: Role[] = [
  ROLES.MANAGER,
  ROLES.RISK_MANAGER,
  ROLES.CONTROL_OWNER,
  ROLES.CONTROL_TESTER,
]

// Human-readable role names for UI
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.DIRECTOR]: 'Director',
  [ROLES.MANAGER]: 'Manager',
  [ROLES.RISK_MANAGER]: 'Risk Manager',
  [ROLES.CONTROL_OWNER]: 'Control Owner',
  [ROLES.CONTROL_TESTER]: 'Control Tester',
}

// Role descriptions for UI tooltips/help text
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.DIRECTOR]: 'Full organization management: invite users, assign roles, manage settings',
  [ROLES.MANAGER]: 'Approve changes in four-eye workflow, all Risk Manager permissions',
  [ROLES.RISK_MANAGER]: 'Full ERM access: edit risks, controls, taxonomies, schedules',
  [ROLES.CONTROL_OWNER]: 'View-only access, can submit change requests for approval',
  [ROLES.CONTROL_TESTER]: 'Execute assigned control tests only',
}

/**
 * Check if role has Director-level permissions
 */
export function isDirectorRole(role: Role | null): boolean {
  return role === ROLES.DIRECTOR
}

/**
 * Check if role has Manager-level permissions (Manager or Director)
 */
export function isManagerRole(role: Role | null): boolean {
  return role === ROLES.MANAGER || role === ROLES.DIRECTOR
}

/**
 * Check if role has Risk Manager-level permissions (Risk Manager, Manager, or Director)
 */
export function isRiskManagerRole(role: Role | null): boolean {
  return role === ROLES.RISK_MANAGER || isManagerRole(role)
}
