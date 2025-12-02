import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

// Route definitions
const publicRoutes = ['/', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
const mfaRoutes = ['/mfa']
const onboardingRoutes = ['/onboarding']
const pendingApprovalRoutes = ['/pending-approval']

const DEFAULT_REDIRECT = '/dashboard'
const ONBOARDING_ROUTE = '/onboarding'
const PENDING_APPROVAL_ROUTE = '/pending-approval'
const LOGIN_ROUTE = '/login'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip API routes
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Skip static files
  if (pathname.startsWith('/_next') || pathname.includes('.')) {
    return NextResponse.next()
  }

  // Get session from better-auth
  const session = await auth.api.getSession({
    headers: request.headers,
  })

  const isLoggedIn = !!session?.user
  const isPublicRoute = publicRoutes.includes(pathname)
  const isAuthRoute = authRoutes.includes(pathname)
  const isMfaRoute = mfaRoutes.includes(pathname)
  const isOnboardingRoute = onboardingRoutes.includes(pathname)
  const isPendingApprovalRoute = pendingApprovalRoutes.includes(pathname)

  // Allow MFA, onboarding, and pending approval routes without session redirect
  if (isMfaRoute || isOnboardingRoute || isPendingApprovalRoute) {
    return NextResponse.next()
  }

  // Auth routes (login, register, etc.)
  if (isAuthRoute) {
    if (isLoggedIn) {
      const user = session.user as { status?: string; onboardingComplete?: boolean; twoFactorEnabled?: boolean }

      // Check onboarding status
      if (!user.onboardingComplete) {
        return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
      }

      // Check approval status
      if (user.status === 'pending') {
        return NextResponse.redirect(new URL(PENDING_APPROVAL_ROUTE, request.url))
      }

      // Check MFA requirement
      if (user.twoFactorEnabled) {
        // MFA is handled by better-auth's two-factor plugin
        // If twoFactorEnabled is true and session exists, user has completed MFA
      }

      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url))
    }
    return NextResponse.next()
  }

  // Protected routes - require login
  if (!isLoggedIn && !isPublicRoute) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Logged in user checks
  if (isLoggedIn) {
    const user = session.user as { status?: string; onboardingComplete?: boolean }

    // Check onboarding status
    if (!user.onboardingComplete && !isOnboardingRoute) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
    }

    // Check approval status
    if (user.status === 'pending' && !isPendingApprovalRoute) {
      return NextResponse.redirect(new URL(PENDING_APPROVAL_ROUTE, request.url))
    }

    // Reject rejected users
    if (user.status === 'rejected') {
      return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
  ],
}
