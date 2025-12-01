import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

import { env } from '@/common/env'

// AES-256-GCM 알고리즘 사용
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

/**
 * 암호화된 TOTP secret을 복호화합니다.
 */
export function decryptTotpSecret(encryptedData: string): string {
  const key = getEncryptionKey()
  const [ivBase64, tagBase64, encrypted] = encryptedData.split(':')

  if (!ivBase64 || !tagBase64 || !encrypted) {
    throw new Error('Invalid encrypted data format')
  }

  const iv = Buffer.from(ivBase64, 'base64')
  const tag = Buffer.from(tagBase64, 'base64')

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  let decrypted = decipher.update(encrypted, 'base64', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

/**
 * TOTP secret을 암호화합니다.
 * 형식: IV:TAG:ENCRYPTED (base64)
 */
export function encryptTotpSecret(secret: string): string {
  const key = getEncryptionKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let encrypted = cipher.update(secret, 'utf8', 'base64')
  encrypted += cipher.final('base64')

  const tag = cipher.getAuthTag()

  // IV:TAG:ENCRYPTED 형식으로 저장
  return `${iv.toString('base64')}:${tag.toString('base64')}:${encrypted}`
}

/**
 * 신뢰 기기 fingerprint 생성
 */
export function generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
  const data = `${userAgent}:${ipAddress}`
  return createHash('sha256').update(data).digest('hex')
}

/**
 * 복구 코드 생성 (8자리 영숫자, 대문자)
 */
export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동 가능한 문자 제외 (0, O, 1, I)
  const bytes = randomBytes(8)
  let code = ''

  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length]
  }

  // XXXX-XXXX 형식
  return `${code.slice(0, 4)}-${code.slice(4)}`
}

// AUTH_SECRET을 사용하여 32바이트 키 생성
function getEncryptionKey(): Buffer {
  const secret = env.AUTH_SECRET
  return createHash('sha256').update(secret).digest()
}
