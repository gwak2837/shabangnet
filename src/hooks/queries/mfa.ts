'use server'

import { auth } from '@/auth'
import {
  getPasskeyCredentials,
  getRemainingRecoveryCodesCount,
  getUserMfaSettings,
} from '@/lib/mfa'

// ============================================================================
// Types
// ============================================================================

interface ActionResult {
  error?: string
  success: boolean
}

interface MfaSettingsResult extends ActionResult {
  settings?: {
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
export async function getMfaSettings(): Promise<MfaSettingsResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    const mfaSettings = await getUserMfaSettings(userId)
    const passkeys = await getPasskeyCredentials(userId)
    const recoveryCodesRemaining = await getRemainingRecoveryCodesCount(userId)

    return {
      success: true,
      settings: {
        totpEnabled: mfaSettings.totpEnabled,
        passkeyEnabled: mfaSettings.passkeyEnabled,
        passkeys: passkeys.map((p) => ({
          id: p.id,
          name: p.name,
          createdAt: p.createdAt.toISOString(),
          lastUsedAt: p.lastUsedAt?.toISOString() ?? null,
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

