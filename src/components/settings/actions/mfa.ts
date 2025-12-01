'use server'

import type { RegistrationResponseJSON } from '@simplewebauthn/server'

import { auth } from '@/auth'
import {
  consumeWebAuthnChallenge,
  createRegistrationOptions,
  deletePasskey,
  disableTotp,
  encodePublicKey,
  generateRecoveryCodes,
  generateTotpQrCode,
  generateTotpSecret,
  getDecryptedTotpSecret,
  getPasskeyById,
  getPasskeyCredentials,
  getRemainingRecoveryCodesCount,
  getTotpCredential,
  getUserMfaSettings,
  savePasskeyCredential,
  saveTotpSecret,
  saveWebAuthnChallenge,
  verifyRegistration,
  verifyTotpCredential,
  verifyTotpToken,
} from '@/lib/mfa'

// ============================================================================
// Types
// ============================================================================

interface ActionResult {
  error?: string
  success: boolean
}

type PasskeyRegistrationOptions = Awaited<ReturnType<typeof createRegistrationOptions>>

interface PasskeyRegistrationOptionsResult extends ActionResult {
  challengeId?: string
  options?: PasskeyRegistrationOptions
}

interface PasskeyRegistrationVerifyResult extends ActionResult {
  recoveryCodes?: string[]
}

interface RecoveryGenerateResult extends ActionResult {
  codes?: string[]
}

interface TotpSetupResult extends ActionResult {
  qrCode?: string
  secret?: string
}

interface TotpVerifyResult extends ActionResult {
  recoveryCodes?: string[]
}

// ============================================================================
// TOTP Setup Actions
// ============================================================================

/**
 * 패스키를 삭제합니다.
 */
export async function deletePasskeyAction(credentialId: string): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id
    const isAdmin = session.user.roles?.includes('admin')

    // 패스키 확인
    const credential = await getPasskeyById(credentialId)
    if (!credential) {
      return { success: false, error: '패스키를 찾을 수 없습니다.' }
    }

    if (credential.userId !== userId) {
      return { success: false, error: '권한이 없습니다.' }
    }

    // 관리자는 최소 1개의 패스키를 유지해야 함
    if (isAdmin) {
      const allCredentials = await getPasskeyCredentials(userId)
      if (allCredentials.length <= 1) {
        return { success: false, error: '관리자는 최소 1개의 패스키를 유지해야 합니다.' }
      }
    }

    await deletePasskey(credentialId, userId)

    return { success: true }
  } catch (error) {
    console.error('Passkey delete error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * TOTP를 비활성화합니다.
 * 보안을 위해 현재 TOTP 코드 확인이 필요합니다.
 */
export async function disableTotpAction(code: string): Promise<ActionResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    if (!code || code.length !== 6) {
      return { success: false, error: '6자리 인증 코드를 입력해주세요.' }
    }

    // TOTP가 활성화되어 있는지 확인
    const mfaSettings = await getUserMfaSettings(userId)
    if (!mfaSettings.totpEnabled) {
      return { success: false, error: 'TOTP가 활성화되어 있지 않습니다.' }
    }

    // secret 복호화
    const secret = await getDecryptedTotpSecret(userId)
    if (!secret) {
      return { success: false, error: 'TOTP secret을 찾을 수 없습니다.' }
    }

    // 코드 검증
    const isValid = verifyTotpToken(secret, code)
    if (!isValid) {
      return { success: false, error: '인증 코드가 올바르지 않습니다.' }
    }

    // TOTP 비활성화
    await disableTotp(userId)

    return { success: true }
  } catch (error) {
    console.error('TOTP disable error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 새로운 복구 코드를 생성합니다.
 * 기존 복구 코드는 모두 무효화됩니다.
 */
export async function generateRecoveryCodesAction(): Promise<RecoveryGenerateResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    // MFA가 활성화되어 있는지 확인
    const mfaSettings = await getUserMfaSettings(userId)
    if (!mfaSettings.totpEnabled && !mfaSettings.passkeyEnabled) {
      return { success: false, error: 'MFA가 활성화되어 있지 않습니다.' }
    }

    // 복구 코드 생성
    const codes = await generateRecoveryCodes(userId)

    return {
      success: true,
      codes,
    }
  } catch (error) {
    console.error('Recovery code generate error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Passkey Setup Actions
// ============================================================================

/**
 * 패스키 등록 옵션을 생성합니다.
 */
export async function getPasskeyRegistrationOptions(): Promise<PasskeyRegistrationOptionsResult> {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id
    const userEmail = session.user.email
    const userName = session.user.name

    // 기존 패스키 가져오기
    const existingCredentials = await getPasskeyCredentials(userId)

    // 등록 옵션 생성
    const options = await createRegistrationOptions(
      userId,
      userEmail,
      userName ?? null,
      existingCredentials.map((c) => ({ id: c.id, transports: c.transports ?? undefined })),
    )

    // 챌린지 저장
    const challenge = await saveWebAuthnChallenge(options.challenge, 'registration', userId)

    return {
      success: true,
      options,
      challengeId: challenge.id,
    }
  } catch (error) {
    console.error('Passkey registration options error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * TOTP 설정을 시작합니다.
 * 새로운 secret을 생성하고 QR 코드를 반환합니다.
 */
export async function setupTotp(): Promise<TotpSetupResult> {
  try {
    const session = await auth()

    if (!session?.user?.id || !session?.user?.email) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id
    const email = session.user.email

    // 이미 TOTP가 활성화되어 있는지 확인
    const existingCredential = await getTotpCredential(userId)
    if (existingCredential?.verified) {
      return { success: false, error: 'TOTP가 이미 활성화되어 있습니다.' }
    }

    // 새 secret 생성
    const secret = generateTotpSecret()

    // 암호화하여 저장 (아직 미인증 상태)
    await saveTotpSecret(userId, secret)

    // QR 코드 생성
    const qrCode = await generateTotpQrCode(email, secret)

    return {
      success: true,
      secret, // 수동 입력용
      qrCode, // QR 코드 이미지 (base64)
    }
  } catch (error) {
    console.error('TOTP setup error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 패스키 등록을 검증하고 저장합니다.
 */
export async function verifyPasskeyRegistration(
  challengeId: string,
  response: RegistrationResponseJSON,
  name?: string,
): Promise<PasskeyRegistrationVerifyResult> {
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

    // 등록 검증
    const verification = await verifyRegistration(response, challenge.challenge)

    if (!verification.verified || !verification.registrationInfo) {
      return { success: false, error: '패스키 검증에 실패했습니다.' }
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo

    // 패스키 저장
    await savePasskeyCredential({
      id: response.id,
      userId,
      publicKey: encodePublicKey(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: response.response.transports ? JSON.stringify(response.response.transports) : undefined,
      name: name || `패스키 ${new Date().toLocaleDateString('ko-KR')}`,
    })

    // 첫 번째 패스키 등록 시 복구 코드 생성
    const existingCredentials = await getPasskeyCredentials(userId)
    const remainingCodes = await getRemainingRecoveryCodesCount(userId)

    let recoveryCodes: string[] | undefined
    if (existingCredentials.length === 1 && remainingCodes === 0) {
      recoveryCodes = await generateRecoveryCodes(userId)
    }

    return {
      success: true,
      recoveryCodes,
    }
  } catch (error) {
    console.error('Passkey registration verify error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

// ============================================================================
// Recovery Code Actions
// ============================================================================

/**
 * TOTP 코드를 검증하고 활성화합니다.
 * 최초 설정 시에만 사용됩니다.
 */
export async function verifyTotpSetup(code: string): Promise<TotpVerifyResult> {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userId = session.user.id

    if (!code || code.length !== 6) {
      return { success: false, error: '6자리 인증 코드를 입력해주세요.' }
    }

    // 미인증 TOTP credential이 있는지 확인
    const credential = await getTotpCredential(userId)
    if (!credential) {
      return { success: false, error: 'TOTP 설정을 먼저 진행해주세요.' }
    }

    if (credential.verified) {
      return { success: false, error: 'TOTP가 이미 활성화되어 있습니다.' }
    }

    // secret 복호화
    const secret = await getDecryptedTotpSecret(userId)
    if (!secret) {
      return { success: false, error: 'TOTP secret을 찾을 수 없습니다.' }
    }

    // 코드 검증
    const isValid = verifyTotpToken(secret, code)
    if (!isValid) {
      return { success: false, error: '인증 코드가 올바르지 않습니다.' }
    }

    // TOTP 활성화
    await verifyTotpCredential(userId)

    // 복구 코드 생성
    const recoveryCodes = await generateRecoveryCodes(userId)

    return {
      success: true,
      recoveryCodes,
    }
  } catch (error) {
    console.error('TOTP verify error:', error)
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}
