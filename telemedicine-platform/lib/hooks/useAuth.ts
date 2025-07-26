'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { UserRole } from '../auth-utils'

interface UseAuthOptions {
  required?: boolean
  redirectTo?: string
  allowedRoles?: UserRole | UserRole[]
}

export function useAuth(options: UseAuthOptions = {}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  
  const { required = false, redirectTo = '/login', allowedRoles } = options

  useEffect(() => {
    if (status === 'loading') return // Still loading

    // If authentication is required but user is not authenticated
    if (required && status === 'unauthenticated') {
      router.push(redirectTo)
      return
    }

    // If user is authenticated but account is inactive
    if (session?.user && !session.user.isActive) {
      router.push('/inactive')
      return
    }

    // If specific roles are required
    if (session?.user && allowedRoles) {
      const userRole = session.user.role as UserRole
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles]
      
      if (!roles.includes(userRole)) {
        // Redirect to user's appropriate dashboard
        const roleRedirects = {
          patient: '/patient',
          doctor: '/doctor',
          agent: '/agent',
          admin: '/admin'
        }
        router.push(roleRedirects[userRole] || '/login')
      }
    }
  }, [session, status, required, redirectTo, allowedRoles, router])

  return {
    user: session?.user ? {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as UserRole,
      isActive: session.user.isActive
    } : null,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    session
  }
}

export function useRequireAuth(redirectTo = '/login') {
  return useAuth({ required: true, redirectTo })
}

export function useRequireRole(allowedRoles: UserRole | UserRole[]) {
  return useAuth({ required: true, allowedRoles })
}