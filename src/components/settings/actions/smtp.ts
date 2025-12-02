'use server'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { settings } from '@/db/schema/settings'
import { LEGACY_SMTP_KEYS, testSMTPConnection } from '@/lib/email'
import { decrypt, encrypt, maskPassword } from '@/utils/crypto'

// ============================================================================
// Types
// ============================================================================

export interface SMTPSettingsData {
  fromName: string
  host: string
  password: string
  username: string
}

export interface SMTPSettingsDisplay extends Omit<SMTPSettingsData, 'password'> {
  hasPassword: boolean
  maskedPassword: string
}

interface ActionResult {
  error?: string
  message?: string
  success: boolean
}

interface SettingToSave {
  description: string
  key: string
  value: string
}

// ============================================================================
// SMTP Actions
// ============================================================================

/**
 * DB에서 SMTP 설정을 조회합니다.
 * 비밀번호는 마스킹 처리되어 반환됩니다.
 */
export async function getSmtpSettingsAction(): Promise<{
  settings: SMTPSettingsDisplay | null
  success: boolean
  error?: string
}> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.key, LEGACY_SMTP_KEYS.host))
      .union(db.select().from(settings).where(eq(settings.key, LEGACY_SMTP_KEYS.user)))
      .union(db.select().from(settings).where(eq(settings.key, LEGACY_SMTP_KEYS.pass)))
      .union(db.select().from(settings).where(eq(settings.key, LEGACY_SMTP_KEYS.fromName)))

    // 설정이 없으면 null 반환
    if (rows.length === 0) {
      return { success: true, settings: null }
    }

    // key-value를 객체로 변환
    const settingsMap = new Map(rows.map((r) => [r.key, r.value]))

    const host = settingsMap.get(LEGACY_SMTP_KEYS.host) || ''
    const username = settingsMap.get(LEGACY_SMTP_KEYS.user) || ''
    const encryptedPassword = settingsMap.get(LEGACY_SMTP_KEYS.pass) || ''
    const fromName = settingsMap.get(LEGACY_SMTP_KEYS.fromName) || ''

    // 비밀번호 마스킹 처리
    let maskedPassword = ''
    let hasPassword = false
    if (encryptedPassword) {
      try {
        const decrypted = decrypt(encryptedPassword)
        maskedPassword = maskPassword(decrypted)
        hasPassword = true
      } catch {
        // 복호화 실패 시 빈 값으로 처리
        maskedPassword = ''
        hasPassword = false
      }
    }

    return {
      success: true,
      settings: {
        host,
        username,
        maskedPassword,
        hasPassword,
        fromName,
      },
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '설정을 불러오는 중 오류가 발생했습니다.'
    return { success: false, settings: null, error: errorMessage }
  }
}

/**
 * SMTP 설정을 DB에 저장합니다.
 * 비밀번호는 AES-256-GCM으로 암호화되어 저장됩니다.
 */
export async function saveSmtpSettingsAction(data: SMTPSettingsData): Promise<ActionResult> {
  try {
    // 비밀번호 암호화
    const encryptedPassword = data.password ? encrypt(data.password) : ''

    // 각 설정을 upsert
    const settingsToSave = [
      { key: LEGACY_SMTP_KEYS.host, value: data.host, description: 'SMTP 서버 호스트' },
      { key: LEGACY_SMTP_KEYS.user, value: data.username, description: 'SMTP 사용자명' },
      { key: LEGACY_SMTP_KEYS.pass, value: encryptedPassword, description: 'SMTP 비밀번호 (암호화됨)' },
      { key: LEGACY_SMTP_KEYS.fromName, value: data.fromName, description: '발신자 이름' },
    ]

    for (const setting of settingsToSave) {
      await db
        .insert(settings)
        .values({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: setting.value,
            description: setting.description,
            updatedAt: new Date(),
          },
        })
    }

    return {
      success: true,
      message: 'SMTP 설정이 저장되었습니다.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '설정 저장 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * SMTP 연결을 테스트합니다.
 */
export async function testSMTPConnectionAction(): Promise<ActionResult> {
  try {
    const result = await testSMTPConnection()

    if (result.success) {
      return {
        success: true,
        message: 'SMTP 서버에 성공적으로 연결되었습니다.',
      }
    } else {
      return {
        success: false,
        error: result.error || 'SMTP 연결에 실패했습니다.',
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}

/**
 * 비밀번호 변경 없이 SMTP 설정을 업데이트합니다.
 * (비밀번호 필드가 비어있으면 기존 비밀번호 유지)
 */
export async function updateSmtpSettingsAction(
  data: Omit<SMTPSettingsData, 'password'> & { password?: string },
): Promise<ActionResult> {
  try {
    // 비밀번호가 제공되지 않으면 기존 값 유지
    const settingsToSave: SettingToSave[] = [
      { key: LEGACY_SMTP_KEYS.host, value: data.host, description: 'SMTP 서버 호스트' },
      { key: LEGACY_SMTP_KEYS.user, value: data.username, description: 'SMTP 사용자명' },
      { key: LEGACY_SMTP_KEYS.fromName, value: data.fromName, description: '발신자 이름' },
    ]

    // 비밀번호가 제공된 경우에만 업데이트
    if (data.password) {
      const encryptedPassword = encrypt(data.password)
      settingsToSave.push({
        key: LEGACY_SMTP_KEYS.pass,
        value: encryptedPassword,
        description: 'SMTP 비밀번호 (암호화됨)',
      })
    }

    for (const setting of settingsToSave) {
      await db
        .insert(settings)
        .values({
          key: setting.key,
          value: setting.value,
          description: setting.description,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settings.key,
          set: {
            value: setting.value,
            description: setting.description,
            updatedAt: new Date(),
          },
        })
    }

    return {
      success: true,
      message: 'SMTP 설정이 업데이트되었습니다.',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '설정 업데이트 중 오류가 발생했습니다.'
    return { success: false, error: errorMessage }
  }
}
