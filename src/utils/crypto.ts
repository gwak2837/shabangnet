import crypto from 'crypto'

import { env } from '@/common/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // GCM 권장 IV 길이
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32 // AES-256은 32바이트 키 필요

/**
 * AES-256-GCM으로 암호화된 문자열을 복호화합니다.
 * @param ciphertext Base64 인코딩된 암호문
 * @returns 복호화된 평문
 * @throws 복호화 실패 시 에러
 */
export function decrypt(ciphertext: string): string {
  const key = deriveKey()
  const combined = Buffer.from(ciphertext, 'base64')

  // IV, AuthTag, EncryptedData 분리
  const iv = combined.subarray(0, IV_LENGTH)
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted)
  decrypted = Buffer.concat([decrypted, decipher.final()])

  return decrypted.toString('utf8')
}

/**
 * 문자열을 AES-256-GCM으로 암호화합니다.
 * @param plaintext 암호화할 평문
 * @returns Base64 인코딩된 암호문 (IV + AuthTag + CipherText)
 */
export function encrypt(plaintext: string): string {
  const key = deriveKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plaintext, 'utf8')
  encrypted = Buffer.concat([encrypted, cipher.final()])

  const authTag = cipher.getAuthTag()

  // IV(12) + AuthTag(16) + EncryptedData를 결합
  const combined = Buffer.concat([iv, authTag, encrypted])
  return combined.toString('base64')
}

/**
 * 문자열이 암호화된 형식인지 확인합니다.
 * (Base64 형식이고 최소 길이 충족 여부 체크)
 */
export function isEncrypted(value: string): boolean {
  try {
    const decoded = Buffer.from(value, 'base64')
    // 최소 IV(12) + AuthTag(16) + 1바이트 데이터
    return decoded.length >= IV_LENGTH + AUTH_TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * 비밀번호를 마스킹 처리합니다.
 */
export function maskPassword(password: string, visibleChars: number = 1): string {
  if (password.length <= visibleChars * 2) {
    return '•'.repeat(password.length)
  }
  const start = password.slice(0, visibleChars)
  const end = password.slice(-visibleChars)
  const middle = '•'.repeat(Math.min(password.length - visibleChars * 2, 12))
  return `${start}${middle}${end}`
}

/**
 * AUTH_SECRET에서 32바이트 암호화 키를 파생합니다.
 * PBKDF2를 사용하여 일관된 키를 생성합니다.
 */
function deriveKey(): Buffer {
  const secret = env.AUTH_SECRET
  // 고정된 salt를 사용하여 같은 secret에서 항상 같은 키 생성
  const salt = 'shabangnet-smtp-encryption-salt'
  return crypto.pbkdf2Sync(secret, salt, 100000, KEY_LENGTH, 'sha256')
}
