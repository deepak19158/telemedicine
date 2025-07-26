import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { redirect } from 'next/navigation'

export type UserRole = 'patient' | 'doctor' | 'agent' | 'admin'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: UserRole
  isActive: boolean
}

/**
 * Get the current user session on the server side
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }
  
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role as UserRole,
    isActive: session.user.isActive
  }
}

/**
 * Require authentication for a page/API route
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }
  
  if (!user.isActive) {
    redirect('/inactive')
  }
  
  return user
}

/**
 * Require specific role(s) for a page/API route
 */
export async function requireRole(allowedRoles: UserRole | UserRole[]): Promise<AuthUser> {
  const user = await requireAuth()
  
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
  
  if (!roles.includes(user.role)) {
    redirect('/unauthorized')
  }
  
  return user
}

/**
 * Check if user has permission to access a resource
 */
export function hasPermission(
  userRole: UserRole,
  requiredRoles: UserRole | UserRole[]
): boolean {
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  return roles.includes(userRole)
}

/**
 * Get redirect path based on user role
 */
export function getRoleBasedRedirect(role: UserRole): string {
  const redirectPaths = {
    patient: '/patient',
    doctor: '/doctor',
    agent: '/agent',
    admin: '/admin'
  }
  
  return redirectPaths[role] || '/login'
}

/**
 * Role hierarchy for permission checking
 */
export const roleHierarchy = {
  admin: ['admin', 'doctor', 'agent', 'patient'],
  doctor: ['doctor'],
  agent: ['agent'],
  patient: ['patient']
}

/**
 * Check if user has hierarchical permission
 */
export function hasHierarchicalPermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  const userPermissions = roleHierarchy[userRole] || []
  return userPermissions.includes(requiredRole)
}