'use server'

import { cookies, headers } from 'next/headers'

import { auth } from '@/lib/auth'

/**
 * 로그아웃 처리 + 2FA 관련 쿠키 정리
 * better-auth의 signOut은 세션만 삭제하고 2FA 쿠키는 남겨둘 수 있으므로
 * 서버에서 직접 정리
 */
export async function signOut() {
  await auth.api.signOut({ headers: await headers() })
  const cookieStore = await cookies()
  const twoFactorCookies = ['better-auth.two-factor', 'better-auth.two_factor', 'two-factor', 'two_factor']

  for (const name of twoFactorCookies) {
    cookieStore.delete(name)
  }

  return { success: true }
}
