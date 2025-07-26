import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const { token } = req.nextauth
    const { pathname } = req.nextUrl

    // Define role-based access rules
    const roleRoutes = {
      '/patient': ['patient'],
      '/doctor': ['doctor'],
      '/agent': ['agent'],
      '/admin': ['admin']
    }

    // Check if the current path requires specific roles
    for (const [path, allowedRoles] of Object.entries(roleRoutes)) {
      if (pathname.startsWith(path)) {
        if (!token?.role || !allowedRoles.includes(token.role as string)) {
          // Redirect to appropriate dashboard based on user role
          const redirectPath = `/${token?.role || 'login'}`
          return NextResponse.redirect(new URL(redirectPath, req.url))
        }
      }
    }

    // Check if user is active
    if (token && !token.isActive) {
      return NextResponse.redirect(new URL('/inactive', req.url))
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Public routes that don't require authentication
        const publicRoutes = ['/', '/login', '/register', '/api/auth']
        
        // Check if route is public
        if (publicRoutes.some(route => pathname.startsWith(route))) {
          return true
        }
        
        // All other routes require authentication
        return !!token
      }
    }
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)'
  ]
}