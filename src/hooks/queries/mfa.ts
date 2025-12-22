'use server'

import { and, eq } from 'drizzle-orm'
import { headers } from 'next/headers'

import { db } from '@/db/client'
import { account, passkey, twoFactor, user } from '@/db/schema/auth'
import { auth } from '@/lib/auth'

// ============================================================================
// Types
// ============================================================================

interface ActionResult {
  error?: string
  success: boolean
}

interface MFASettingsResult extends ActionResult {
  settings?: {
    hasPassword: boolean
    passkeys: { createdAt: string; id: string; lastUsedAt: string | null; name: string | null }[]
    passkeyEnabled: boolean
    recoveryCodesRemaining: number
    totpEnabled: boolean
  }
}

// ============================================================================
// MFA Settings Query
// ============================================================================

/**
 * 사용자의 MFA 설정을 가져옵니다.
 */
export async function getMFASettings(): Promise<MFASettingsResult> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    // User의 twoFactorEnabled 확인
    const [userData] = await db
      .select({
        twoFactorEnabled: user.twoFactorEnabled,
      })
      .from(user)
      .where(eq(user.id, userId))

    // credential 계정에서 비밀번호 유무 확인
    const [credentialAccount] = await db
      .select({ password: account.password })
      .from(account)
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))

    const hasPassword = !!credentialAccount?.password

    // 패스키 목록 조회
    const passkeys = await db
      .select({
        id: passkey.id,
        name: passkey.name,
        createdAt: passkey.createdAt,
      })
      .from(passkey)
      .where(eq(passkey.userId, userId))

    // Two-factor 테이블에서 백업 코드 확인
    const [twoFactorData] = await db
      .select({ backupCodes: twoFactor.backupCodes })
      .from(twoFactor)
      .where(eq(twoFactor.userId, userId))

    // 백업 코드 개수 계산 (JSON 문자열에서)
    let recoveryCodesRemaining = 0
    if (twoFactorData?.backupCodes) {
      try {
        const codes = JSON.parse(twoFactorData.backupCodes)
        recoveryCodesRemaining = Array.isArray(codes) ? codes.filter((c: { used?: boolean }) => !c.used).length : 0
      } catch {
        recoveryCodesRemaining = 0
      }
    }

    return {
      success: true,
      settings: {
        hasPassword,
        totpEnabled: userData?.twoFactorEnabled ?? false,
        passkeyEnabled: passkeys.length > 0,
        passkeys: passkeys.map((p) => ({
          id: p.id,
          name: p.name,
          createdAt: p.createdAt.toISOString(),
          lastUsedAt: null,
        })),
        recoveryCodesRemaining,
      },
    }
  } catch (error) {
    console.error('MFA settings error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}
