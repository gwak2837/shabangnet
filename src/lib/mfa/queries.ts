import bcrypt from 'bcryptjs'
import { and, eq, gt, isNull } from 'drizzle-orm'

import { db } from '@/db/client'
import {
  passkeyCredentials,
  recoveryCodes,
  totpCredentials,
  trustedDevices,
  users,
  webauthnChallenges,
} from '@/db/schema/auth'

import { decryptTotpSecret, encryptTotpSecret, generateRecoveryCode } from './crypto'

// ============================================
// TOTP 관련 쿼리
// ============================================

/**
 * WebAuthn 챌린지를 가져오고 삭제합니다 (일회용).
 */
export async function consumeWebAuthnChallenge(challengeId: string) {
  const [challenge] = await db
    .select()
    .from(webauthnChallenges)
    .where(and(eq(webauthnChallenges.id, challengeId), gt(webauthnChallenges.expiresAt, new Date())))
    .limit(1)

  if (challenge) {
    await db.delete(webauthnChallenges).where(eq(webauthnChallenges.id, challengeId))
  }

  return challenge
}

/**
 * 사용자의 모든 신뢰 기기를 삭제합니다.
 */
export async function deleteAllTrustedDevices(userId: string) {
  await db.delete(trustedDevices).where(eq(trustedDevices.userId, userId))
}

/**
 * 패스키를 삭제합니다.
 */
export async function deletePasskey(credentialId: string, userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(passkeyCredentials).where(eq(passkeyCredentials.id, credentialId))

    // 남은 패스키가 없으면 passkeyEnabled를 false로
    const remaining = await tx.select().from(passkeyCredentials).where(eq(passkeyCredentials.userId, userId))

    if (remaining.length === 0) {
      await tx.update(users).set({ passkeyEnabled: false, updatedAt: new Date() }).where(eq(users.id, userId))
    }
  })
}

/**
 * 신뢰 기기를 삭제합니다.
 */
export async function deleteTrustedDevice(deviceId: string, userId: string) {
  await db.delete(trustedDevices).where(and(eq(trustedDevices.id, deviceId), eq(trustedDevices.userId, userId)))
}

/**
 * TOTP를 비활성화합니다.
 */
export async function disableTotp(userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(totpCredentials).where(eq(totpCredentials.userId, userId))

    await tx.update(users).set({ totpEnabled: false, updatedAt: new Date() }).where(eq(users.id, userId))
  })
}

// ============================================
// 패스키 관련 쿼리
// ============================================

/**
 * 새로운 복구 코드를 생성합니다.
 * @returns 평문 복구 코드 배열 (사용자에게 표시용)
 */
export async function generateRecoveryCodes(userId: string, count = 10): Promise<string[]> {
  // 기존 복구 코드 삭제
  await db.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId))

  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    const code = generateRecoveryCode()
    const hashedCode = await bcrypt.hash(code, 10)

    await db.insert(recoveryCodes).values({
      userId,
      code: hashedCode,
    })

    codes.push(code)
  }

  return codes
}

/**
 * 저장된 TOTP secret을 복호화하여 반환합니다.
 */
export async function getDecryptedTotpSecret(userId: string): Promise<string | null> {
  const credential = await getTotpCredential(userId)
  if (!credential) return null

  return decryptTotpSecret(credential.secret)
}

/**
 * 패스키 ID로 패스키를 가져옵니다.
 */
export async function getPasskeyById(credentialId: string) {
  const [credential] = await db
    .select()
    .from(passkeyCredentials)
    .where(eq(passkeyCredentials.id, credentialId))
    .limit(1)

  return credential
}

/**
 * 사용자의 모든 패스키를 가져옵니다.
 */
export async function getPasskeyCredentials(userId: string) {
  return db.select().from(passkeyCredentials).where(eq(passkeyCredentials.userId, userId))
}

/**
 * 사용 가능한 복구 코드 수를 가져옵니다.
 */
export async function getRemainingRecoveryCodesCount(userId: string): Promise<number> {
  const codes = await db
    .select()
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)))

  return codes.length
}

/**
 * 사용자의 TOTP 자격 증명을 가져옵니다.
 */
export async function getTotpCredential(userId: string) {
  const [credential] = await db.select().from(totpCredentials).where(eq(totpCredentials.userId, userId)).limit(1)

  return credential
}

// ============================================
// WebAuthn 챌린지 관련 쿼리
// ============================================

/**
 * 사용자의 신뢰 기기 목록을 가져옵니다.
 */
export async function getTrustedDevices(userId: string) {
  return db
    .select()
    .from(trustedDevices)
    .where(and(eq(trustedDevices.userId, userId), gt(trustedDevices.expiresAt, new Date())))
}

/**
 * 사용자의 MFA 설정을 가져옵니다.
 */
export async function getUserMfaSettings(userId: string) {
  const [user] = await db
    .select({
      totpEnabled: users.totpEnabled,
      passkeyEnabled: users.passkeyEnabled,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  return user ?? { totpEnabled: false, passkeyEnabled: false }
}

// ============================================
// 복구 코드 관련 쿼리
// ============================================

/**
 * 신뢰 기기인지 확인합니다.
 */
export async function isTrustedDevice(userId: string, deviceFingerprint: string): Promise<boolean> {
  const [device] = await db
    .select()
    .from(trustedDevices)
    .where(
      and(
        eq(trustedDevices.userId, userId),
        eq(trustedDevices.deviceFingerprint, deviceFingerprint),
        gt(trustedDevices.expiresAt, new Date()),
      ),
    )
    .limit(1)

  return !!device
}

/**
 * 패스키 이름을 변경합니다.
 */
export async function renamePasskey(credentialId: string, name: string) {
  await db.update(passkeyCredentials).set({ name }).where(eq(passkeyCredentials.id, credentialId))
}

/**
 * 사용자의 MFA를 완전히 리셋합니다 (관리자용).
 */
export async function resetUserMfa(userId: string) {
  await db.transaction(async (tx) => {
    await tx.delete(totpCredentials).where(eq(totpCredentials.userId, userId))
    await tx.delete(passkeyCredentials).where(eq(passkeyCredentials.userId, userId))
    await tx.delete(recoveryCodes).where(eq(recoveryCodes.userId, userId))
    await tx.delete(trustedDevices).where(eq(trustedDevices.userId, userId))

    await tx
      .update(users)
      .set({
        totpEnabled: false,
        passkeyEnabled: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  })
}

// ============================================
// 신뢰 기기 관련 쿼리
// ============================================

/**
 * 새 패스키를 저장합니다.
 */
export async function savePasskeyCredential(data: {
  id: string
  userId: string
  publicKey: string
  counter: number
  deviceType?: string
  backedUp?: boolean
  transports?: string
  name?: string
}) {
  await db.transaction(async (tx) => {
    await tx.insert(passkeyCredentials).values(data)

    await tx.update(users).set({ passkeyEnabled: true, updatedAt: new Date() }).where(eq(users.id, data.userId))
  })
}

/**
 * TOTP secret을 저장합니다 (암호화하여 저장).
 */
export async function saveTotpSecret(userId: string, secret: string) {
  const encryptedSecret = encryptTotpSecret(secret)

  await db
    .insert(totpCredentials)
    .values({
      userId,
      secret: encryptedSecret,
      verified: false,
    })
    .onConflictDoUpdate({
      target: totpCredentials.userId,
      set: {
        secret: encryptedSecret,
        verified: false,
      },
    })
}

/**
 * 신뢰 기기를 저장합니다.
 */
export async function saveTrustedDevice(data: {
  userId: string
  deviceFingerprint: string
  userAgent?: string
  ipAddress?: string
  daysValid?: number
}) {
  const daysValid = data.daysValid ?? 30
  const expiresAt = new Date(Date.now() + daysValid * 24 * 60 * 60 * 1000)

  await db.insert(trustedDevices).values({
    userId: data.userId,
    deviceFingerprint: data.deviceFingerprint,
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
    expiresAt,
  })
}

/**
 * WebAuthn 챌린지를 저장합니다.
 */
export async function saveWebAuthnChallenge(
  challenge: string,
  type: 'authentication' | 'registration',
  userId?: string,
) {
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000) // 5분 후 만료

  const [result] = await db
    .insert(webauthnChallenges)
    .values({
      challenge,
      type,
      userId,
      expiresAt,
    })
    .returning()

  return result
}

/**
 * 패스키 카운터를 업데이트합니다.
 */
export async function updatePasskeyCounter(credentialId: string, counter: number) {
  await db
    .update(passkeyCredentials)
    .set({ counter, lastUsedAt: new Date() })
    .where(eq(passkeyCredentials.id, credentialId))
}

// ============================================
// 사용자 MFA 설정 관련 쿼리
// ============================================

/**
 * 복구 코드를 검증합니다.
 */
export async function validateRecoveryCode(userId: string, code: string): Promise<boolean> {
  const unusedCodes = await db
    .select()
    .from(recoveryCodes)
    .where(and(eq(recoveryCodes.userId, userId), isNull(recoveryCodes.usedAt)))

  for (const storedCode of unusedCodes) {
    const isValid = await bcrypt.compare(code.toUpperCase().replace(/-/g, ''), storedCode.code.replace(/-/g, ''))
    if (isValid) {
      // 사용됨으로 표시
      await db.update(recoveryCodes).set({ usedAt: new Date() }).where(eq(recoveryCodes.id, storedCode.id))
      return true
    }
  }

  return false
}

/**
 * TOTP 자격 증명을 검증 완료로 표시하고 사용자의 totpEnabled를 true로 설정합니다.
 */
export async function verifyTotpCredential(userId: string) {
  await db.transaction(async (tx) => {
    await tx.update(totpCredentials).set({ verified: true }).where(eq(totpCredentials.userId, userId))

    await tx.update(users).set({ totpEnabled: true, updatedAt: new Date() }).where(eq(users.id, userId))
  })
}
