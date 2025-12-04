import { type NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/verify-email']
const DEFAULT_REDIRECT = '/dashboard'
const LOGIN_ROUTE = '/login'
const MFA_ROUTE = '/mfa'
const ONBOARDING_ROUTE = '/onboarding'
const PENDING_APPROVAL_ROUTE = '/pending-approval'

interface SessionFields {
  twoFactorVerified?: boolean
}

interface UserFields {
  onboardingComplete?: boolean
  status?: string
  twoFactorEnabled?: boolean
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const sessionData = await auth.api.getSession({ headers: request.headers })
  const isLoggedIn = Boolean(sessionData?.user)
  const isAuthRoute = authRoutes.includes(pathname)
  const user = (sessionData?.user ?? {}) as UserFields
  const session = (sessionData?.session ?? {}) as SessionFields
  const requiresMFAVerification = user.twoFactorEnabled && !session.twoFactorVerified

  if (!isLoggedIn && !isAuthRoute) {
    const loginUrl = new URL(LOGIN_ROUTE, request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      if (user.status === 'rejected') {
        await auth.api.signOut({ headers: request.headers })
        return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
      }
      if (requiresMFAVerification) {
        return NextResponse.redirect(new URL(MFA_ROUTE, request.url))
      }
      if (!user.onboardingComplete) {
        return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
      }
      if (user.status === 'pending') {
        return NextResponse.redirect(new URL(PENDING_APPROVAL_ROUTE, request.url))
      }
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url))
    }

    // 미로그인
    return NextResponse.next()
  }

  if (pathname === ONBOARDING_ROUTE) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
    }
    if (requiresMFAVerification) {
      return NextResponse.redirect(new URL(MFA_ROUTE, request.url))
    }
    if (user.onboardingComplete) {
      if (user.status === 'pending') {
        return NextResponse.redirect(new URL(PENDING_APPROVAL_ROUTE, request.url))
      }
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url))
    }

    // 로그인 + MFA 비활성화
    return NextResponse.next()
  }

  if (pathname === MFA_ROUTE) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
    }
    if (!user.twoFactorEnabled || session.twoFactorVerified) {
      if (!user.onboardingComplete) {
        return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
      }
      if (user.status === 'pending') {
        return NextResponse.redirect(new URL(PENDING_APPROVAL_ROUTE, request.url))
      }
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url))
    }

    // 로그인 + MFA 활성화 + MFA 미검증 시
    return NextResponse.next()
  }

  if (pathname === PENDING_APPROVAL_ROUTE) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
    }
    if (requiresMFAVerification) {
      return NextResponse.redirect(new URL(MFA_ROUTE, request.url))
    }
    if (!user.onboardingComplete) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
    }
    if (user.status !== 'pending') {
      if (user.status === 'rejected') {
        await auth.api.signOut({ headers: request.headers })
        return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
      }
      return NextResponse.redirect(new URL(DEFAULT_REDIRECT, request.url))
    }

    // 로그인 + MFA 활성화 + MFA 검증 + 승인 대기 중
    return NextResponse.next()
  }

  if (isLoggedIn) {
    if (user.status === 'rejected') {
      await auth.api.signOut({ headers: request.headers })
      return NextResponse.redirect(new URL(LOGIN_ROUTE, request.url))
    }
    if (requiresMFAVerification) {
      return NextResponse.redirect(new URL(MFA_ROUTE, request.url))
    }
    if (!user.onboardingComplete) {
      return NextResponse.redirect(new URL(ONBOARDING_ROUTE, request.url))
    }
    if (user.status === 'pending') {
      return NextResponse.redirect(new URL(PENDING_APPROVAL_ROUTE, request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    {
      source: '/((?!api|.*\\.|_next/static|_next/image).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }],
    },
  ],
}
