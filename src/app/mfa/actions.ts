'use server'

import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

import { auth } from '@/auth'
import {
  consumeWebAuthnChallenge,
  createAuthenticationOptions,
  getDecryptedTotpSecret,
  getPasskeyById,
  getPasskeyCredentials,
  saveWebAuthnChallenge,
  updatePasskeyCounter,
  validateRecoveryCode,
  verifyAuthentication,
  verifyTotpToken,
} from '@/lib/mfa'

// ============================================================================
// Types
// ============================================================================

interface ActionResult {
  error?: string
  success: boolean
}

type PasskeyAuthenticationOptions = Awaited<ReturnType<typeof createAuthenticationOptions>>

interface PasskeyAuthenticationOptionsResult extends ActionResult {
  challengeId?: string
  options?: PasskeyAuthenticationOptions
}

// ============================================================================
// TOTP Challenge Actions
// ============================================================================

/**
 * 패스키 인증 옵션을 생성합니다.
 */
export async function getPasskeyAuthenticationOptions(): Promise<PasskeyAuthenticationOptionsResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    // 사용자의 패스키 가져오기
    const credentials = await getPasskeyCredentials(userId)

    if (credentials.length === 0) {
      return { success: false, error: '등록된 패스키가 없습니다.' }
    }

    // 인증 옵션 생성
    const options = await createAuthenticationOptions(
      credentials.map((c) => ({ id: c.id, transports: c.transports ?? undefined })),
    )

    // 챌린지 저장
    const challenge = await saveWebAuthnChallenge(options.challenge, 'authentication', userId)

    return {
      success: true,
      options,
      challengeId: challenge.id,
    }
  } catch (error) {
    console.error('Passkey authentication options error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Passkey Challenge Actions
// ============================================================================

/**
 * 복구 코드를 검증합니다.
 * 성공 시 MFA를 우회합니다.
 */
export async function validateRecoveryCodeAction(code: string): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    if (!code) {
      return { success: false, error: '복구 코드를 입력해주세요.' }
    }

    // 복구 코드 검증
    const isValid = await validateRecoveryCode(userId, code)

    if (!isValid) {
      return { success: false, error: '복구 코드가 올바르지 않습니다.' }
    }

    return { success: true }
  } catch (error) {
    console.error('Recovery code validate error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 로그인 시 TOTP 코드를 검증합니다.
 * MFA 챌린지에서 사용됩니다.
 */
export async function validateTotp(code: string): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    if (!code || code.length !== 6) {
      return { success: false, error: '6자리 인증 코드를 입력해주세요.' }
    }

    // secret 복호화
    const secret = await getDecryptedTotpSecret(userId)
    if (!secret) {
      return { success: false, error: 'TOTP가 설정되어 있지 않습니다.' }
    }

    // 코드 검증
    const isValid = verifyTotpToken(secret, code)
    if (!isValid) {
      return { success: false, error: '인증 코드가 올바르지 않습니다.' }
    }

    return { success: true }
  } catch (error) {
    console.error('TOTP validate error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Recovery Code Challenge Actions
// ============================================================================

/**
 * 패스키 인증을 검증합니다.
 */
export async function verifyPasskeyAuthentication(
  challengeId: string,
  response: AuthenticationResponseJSON,
): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    if (!challengeId || !response) {
      return { success: false, error: '잘못된 요청입니다.' }
    }

    // 챌린지 가져오기 및 삭제 (일회용)
    const challenge = await consumeWebAuthnChallenge(challengeId)
    if (!challenge) {
      return { success: false, error: '챌린지가 만료되었거나 유효하지 않습니다.' }
    }

    if (challenge.userId !== userId) {
      return { success: false, error: '권한이 없습니다.' }
    }

    // 패스키 가져오기
    const credentialId = response.id
    const credential = await getPasskeyById(credentialId)

    if (!credential) {
      return { success: false, error: '등록되지 않은 패스키입니다.' }
    }

    if (credential.userId !== userId) {
      return { success: false, error: '권한이 없습니다.' }
    }

    // 인증 검증
    const verification = await verifyAuthentication(response, challenge.challenge, {
      id: credential.id,
      publicKey: credential.publicKey,
      counter: credential.counter,
    })

    if (!verification.verified) {
      return { success: false, error: '패스키 검증에 실패했습니다.' }
    }

    // 카운터 업데이트
    await updatePasskeyCounter(credentialId, verification.authenticationInfo.newCounter)

    return { success: true }
  } catch (error) {
    console.error('Passkey authentication verify error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}
