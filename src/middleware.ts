import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const path = req.nextUrl.pathname
    
    // Admin-Bereich Prüfung
    if (path.startsWith('/admin')) {
      const adminRoles = ['ADMIN', 'HEAD_ADMIN', 'SUPER_ADMIN']
      
      if (!token?.role || !adminRoles.includes(token.role as string)) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }
    
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        // Öffentliche Pfade
        const publicPaths = ['/login', '/api/auth']
        
        if (publicPaths.some((p) => path.startsWith(p))) {
          return true
        }
        
        // Alle anderen Pfade benötigen Auth
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
