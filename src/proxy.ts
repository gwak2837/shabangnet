import { NextRequest, NextResponse } from 'next/server'

import { auth } from '@/lib/auth'

// 라우트 정의
const publicRoutes = ['/']
const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password', '/mfa']
const adminRoutes = ['/user']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 공개 라우트 통과
  if (publicRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'))) {
    return NextResponse.next()
  }

  // 세션 확인
  const session = await auth.api.getSession({ headers: request.headers })
  const user = session?.user

  // 비로그인 + 보호된 페이지 → /login
  if (!session && !authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session && user) {
    // 로그인 + 인증 페이지 - /dashboard 리다이렉트
    if (authRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // 1. onboarding 미완료 → /onboarding
    if (!user.onboardingComplete && pathname !== '/onboarding') {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }

    // 2. onboarding 완료 + pending → /pending-approval
    if (user.onboardingComplete && user.status === 'pending' && pathname !== '/pending-approval') {
      return NextResponse.redirect(new URL('/pending-approval', request.url))
    }

    // 일반 사용자 + 관리자 전용 페이지 → /dashboard 리다이렉트
    if (adminRoutes.some((r) => pathname.startsWith(r)) && !user.isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
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
