'use server'

import { createAdminClient } from '@/lib/supabase-server'
import { authLogger } from '@/lib/auth-logger'

export type AdminRole = 'super_admin' | 'admin' | 'teacher' | 'student'

export interface AdminCapabilities {
  canManageAdmins: boolean
  canManageSchools: boolean
  canManagePins: boolean
  canViewDashboard: boolean
  canResetPasswords: boolean
  canDeleteAdmins: boolean
}

export interface AdminAuthInfo {
  isAuthenticated: boolean
  role: AdminRole
  email?: string
  capabilities: AdminCapabilities
}

/**
 * Get admin role for a specific user by email
 */
export async function getAdminRoleByEmail(email: string): Promise<AdminRole> {
  try {
    const adminClient = await createAdminClient()
    const { data: users } = await adminClient.auth.admin.listUsers()

    const user = users?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
    if (!user) {
      return 'student'
    }

    const role = (user.app_metadata?.role as string) || 'student'
    return role as AdminRole
  } catch (error) {
    authLogger.error('[getAdminRoleByEmail] Error getting role', error)
    return 'student'
  }
}

/**
 * Get capabilities for a specific role
 */
export function getCapabilitiesByRole(role: AdminRole): AdminCapabilities {
  const baseCapabilities: AdminCapabilities = {
    canManageAdmins: false,
    canManageSchools: false,
    canManagePins: false,
    canViewDashboard: false,
    canResetPasswords: false,
    canDeleteAdmins: false,
  }

  switch (role) {
    case 'super_admin':
      return {
        canManageAdmins: true,
        canManageSchools: true,
        canManagePins: true,
        canViewDashboard: true,
        canResetPasswords: true,
        canDeleteAdmins: true,
      }
    case 'admin':
      return {
        canManageAdmins: false,
        canManageSchools: false,
        canManagePins: true,
        canViewDashboard: false,
        canResetPasswords: false,
        canDeleteAdmins: false,
      }
    default:
      return baseCapabilities
  }
}

