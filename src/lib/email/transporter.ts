import { eq } from 'drizzle-orm'
import nodemailer from 'nodemailer'
import 'server-only'

import { db } from '@/db/client'
import { settings, smtpAccount } from '@/db/schema/settings'
import { decrypt } from '@/utils/crypto'

import type { SMTPAccountPurpose, SMTPConnectionConfig } from './config'

import { LEGACY_SMTP_KEYS, SMTP_DEFAULT_PORT } from './config'

// ============================================================================
// Transporter Creation
// ============================================================================

/**
 * Nodemailer transporter를 생성합니다.
 * @param purpose SMTP 계정 용도 (system | order)
 * @returns Nodemailer transporter
 */
export async function createTransporter(purpose: SMTPAccountPurpose = 'system') {
  const config = await loadSMTPConfig(purpose)

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: false, // STARTTLS 사용
    requireTLS: true, // TLS 필수
    auth: config.auth,
    tls: { rejectUnauthorized: true },
  })
}

/**
 * 발신자 주소를 포맷합니다.
 * @param config SMTP 연결 설정
 * @returns 포맷된 발신자 주소 (예: "다온푸드" <sender@example.com>)
 */
export function formatFromAddress(config: SMTPConnectionConfig): string {
  return config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail
}

// ============================================================================
// Config Loading
// ============================================================================

/**
 * SMTP 설정을 로드합니다.
 * 우선순위: DB (smtp_account) > DB (legacy settings) > 환경변수
 * @param purpose SMTP 계정 용도
 * @returns SMTP 연결 설정
 */
export async function loadSMTPConfig(purpose: SMTPAccountPurpose = 'system'): Promise<SMTPConnectionConfig> {
  // 1. 새 테이블에서 용도별 계정 조회
  const accountConfig = await loadSMTPConfigFromAccounts(purpose)
  if (accountConfig) {
    return accountConfig
  }

  // 2. 레거시 설정 테이블에서 조회 (fallback)
  const legacyConfig = await loadLegacySMTPConfigFromDB()
  if (legacyConfig) {
    return legacyConfig
  }

  throw new Error('SMTP 설정이 없습니다. 설정 페이지에서 SMTP를 설정해주세요.')
}

/**
 * DB에서 레거시 SMTP 설정을 로드합니다.
 * @deprecated Multi-SMTP 구현 후 smtp_account 테이블 사용
 */
async function loadLegacySMTPConfigFromDB(): Promise<SMTPConnectionConfig | null> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.key, LEGACY_SMTP_KEYS.host))
      .union(db.select().from(settings).where(eq(settings.key, LEGACY_SMTP_KEYS.user)))
      .union(db.select().from(settings).where(eq(settings.key, LEGACY_SMTP_KEYS.pass)))
      .union(db.select().from(settings).where(eq(settings.key, LEGACY_SMTP_KEYS.fromName)))

    if (rows.length === 0) {
      return null
    }

    const settingsMap = new Map(rows.map((r) => [r.key, r.value]))

    const host = settingsMap.get(LEGACY_SMTP_KEYS.host)
    const user = settingsMap.get(LEGACY_SMTP_KEYS.user)
    const encryptedPass = settingsMap.get(LEGACY_SMTP_KEYS.pass)

    if (!host || !user || !encryptedPass) {
      return null
    }

    const pass = decrypt(encryptedPass)
    const fromName = settingsMap.get(LEGACY_SMTP_KEYS.fromName) || ''

    return {
      host,
      port: SMTP_DEFAULT_PORT,
      auth: { user, pass },
      fromName,
      fromEmail: user,
    }
  } catch {
    return null
  }
}

/**
 * smtp_account 테이블에서 SMTP 설정을 로드합니다.
 * @param purpose SMTP 계정 용도
 */
async function loadSMTPConfigFromAccounts(purpose: SMTPAccountPurpose): Promise<SMTPConnectionConfig | null> {
  try {
    const [account] = await db.select().from(smtpAccount).where(eq(smtpAccount.purpose, purpose)).limit(1)

    if (!account || !account.enabled) {
      return null
    }

    const decryptedPassword = decrypt(account.password)

    return {
      host: account.host,
      port: account.port,
      auth: {
        user: account.username,
        pass: decryptedPassword,
      },
      fromName: account.fromName || '',
      fromEmail: account.username,
    }
  } catch {
    return null
  }
}
