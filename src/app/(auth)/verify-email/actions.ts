'use server'

import { and, eq, gt } from 'drizzle-orm'

import { db } from '@/db/client'
import { user, verification } from '@/db/schema/auth'

interface VerifyResult {
  error?: string
  redirectTo?: string
  success?: string
}

export async function verifyEmailToken(token: string): Promise<VerifyResult> {
  try {
    const [claimedToken] = await db
      .delete(verification)
      .where(and(eq(verification.value, token), gt(verification.expiresAt, new Date())))
      .returning()

    if (!claimedToken) {
      return { error: '잘못된 인증 요청이에요. 토큰이 만료되었거나 이미 사용되었을 수 있어요.' }
    }

    const [updatedUser] = await db
      .update(user)
      .set({
        emailVerified: true,
        email: claimedToken.identifier,
        updatedAt: new Date(),
      })
      .where(eq(user.email, claimedToken.identifier))
      .returning({
        id: user.id,
        email: user.email,
        onboardingComplete: user.onboardingComplete,
      })

    if (!updatedUser) {
      return { error: '사용자를 찾을 수 없어요.' }
    }

    // 온보딩이 완료되지 않은 경우 온보딩으로 리다이렉트
    if (!updatedUser.onboardingComplete) {
      return {
        success: '이메일이 인증됐어요!',
        redirectTo: '/onboarding',
      }
    }

    return {
      success: '이메일이 인증됐어요!',
      redirectTo: '/login',
    }
  } catch (error) {
    console.error('Email verification error:', error)
    return { error: '알 수 없는 오류가 발생했어요' }
  }
}
