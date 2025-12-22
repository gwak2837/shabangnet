'use server'

import { eq } from 'drizzle-orm'
import { cookies, headers } from 'next/headers'

import { db } from '@/db/client'
import { passkey, user } from '@/db/schema/auth'
import { auth } from '@/lib/auth'

export async function completeOnboarding(): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await auth.api.getSession({ headers: await headers() })

    if (!session?.user) {
      return { success: false, error: '인증되지 않은 사용자입니다' }
    }

    const hasTOTP = session.user.twoFactorEnabled === true
    const userPasskeys = await db
      .select({ id: passkey.id })
      .from(passkey)
      .where(eq(passkey.userId, session.user.id))
      .limit(1)
    const hasPasskey = userPasskeys.length > 0

    if (!hasTOTP && !hasPasskey) {
      return { success: false, error: '2FA 설정이 필요합니다' }
    }

    await db
      .update(user)
      .set({
        onboardingComplete: true,
        updatedAt: new Date(),
      })
      .where(eq(user.id, session.user.id))

    // 세션 캐시 갱신 (DB에서 새로 fetch하고 쿠키 캐시 업데이트)
    await auth.api.getSession({
      headers: await headers(),
      query: { disableCookieCache: true },
    })

    return { success: true }
  } catch (error) {
    console.error('Complete onboarding error:', error)
    return { success: false, error: '온보딩 완료 처리에 실패했어요' }
  }
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() })
  const cookieStore = await cookies()
  const twoFactorCookies = ['better-auth.two-factor', 'better-auth.two_factor', 'two-factor', 'two_factor']

  for (const name of twoFactorCookies) {
    cookieStore.delete(name)
  }

  return { success: true }
}
