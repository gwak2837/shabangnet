import type { Attachment } from 'nodemailer/lib/mailer'

import { eq } from 'drizzle-orm'
import nodemailer from 'nodemailer'

import { env } from '@/common/env'
import { db } from '@/db/client'
import { settings } from '@/db/schema/settings'
import { decrypt } from '@/utils/crypto'

// 이메일 발송 옵션 타입
export interface SendEmailOptions {
  attachments?: Attachment[]
  cc?: string | string[]
  html?: string
  subject: string
  text?: string
  to: string | string[]
}

// 이메일 발송 결과 타입
export interface SendEmailResult {
  error?: string
  messageId?: string
  success: boolean
}

// SMTP 설정 타입
interface SMTPConfig {
  auth: {
    user: string
    pass: string
  }
  fromEmail: string
  fromName: string
  host: string
  port: number
  requireTLS: boolean
  secure: boolean
}

// SMTP 설정 키 상수
const SMTP_KEYS = {
  fromEmail: 'smtp.fromEmail',
  fromName: 'smtp.fromName',
  host: 'smtp.host',
  pass: 'smtp.pass',
  port: 'smtp.port',
  user: 'smtp.user',
} as const

/**
 * 이메일 발송 함수
 * @param options 이메일 발송 옵션 (수신자, 제목, 내용, 첨부파일 등)
 * @returns 발송 결과
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const transporter = await createTransporter()
    const from = await getFromAddress()

    const mailOptions = {
      from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc.join(', ') : options.cc) : undefined,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    }

    const info = await transporter.sendMail(mailOptions)

    return {
      success: true,
      messageId: info.messageId,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * 발주서 이메일 발송을 위한 헬퍼 함수
 * @param manufacturerEmail 제조사 이메일
 * @param manufacturerName 제조사명
 * @param subject 메일 제목
 * @param body 메일 본문
 * @param attachments 첨부파일 (엑셀 등)
 */
export async function sendOrderEmail(
  manufacturerEmail: string,
  _manufacturerName: string,
  subject: string,
  body: string,
  attachments?: Attachment[],
): Promise<SendEmailResult> {
  return sendEmail({
    to: manufacturerEmail,
    subject,
    html: body,
    attachments,
  })
}

/**
 * SMTP 연결 테스트 함수
 * @returns 연결 성공 여부
 */
export async function testSMTPConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await createTransporter()

    // SMTP 서버 연결 확인
    await transporter.verify()

    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'

    return {
      success: false,
      error: errorMessage,
    }
  }
}

// Nodemailer transporter 생성
async function createTransporter() {
  const config = await loadSMTPConfig()

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    auth: config.auth,
    // TLS 옵션: 자체 서명 인증서 거부 (프로덕션 권장)
    tls: {
      rejectUnauthorized: true,
    },
  })
}

// 발신자 정보 가져오기
async function getFromAddress(): Promise<string> {
  const config = await loadSMTPConfig()

  return config.fromName ? `"${config.fromName}" <${config.fromEmail}>` : config.fromEmail
}

/**
 * 환경변수에서 SMTP 설정을 가져옵니다. (fallback)
 * 필수 환경변수가 없으면 null 반환
 */
function getSMTPConfigFromEnv(): SMTPConfig | null {
  const host = env.SMTP_HOST
  const user = env.SMTP_USER
  const pass = env.SMTP_PASS

  // 필수 설정이 없으면 null 반환
  if (!host || !user || !pass) {
    return null
  }

  const port = env.SMTP_PORT ?? 587

  return {
    host,
    port,
    // 포트 465는 Implicit TLS, 그 외는 STARTTLS
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
    fromName: env.SMTP_FROM_NAME || '',
    fromEmail: env.SMTP_FROM_EMAIL || user,
  }
}

// SMTP 설정 로드 (DB 우선, 환경변수 fallback)
async function loadSMTPConfig(): Promise<SMTPConfig> {
  const config = (await loadSMTPConfigFromDB()) || getSMTPConfigFromEnv()

  if (!config) {
    throw new Error('SMTP 설정이 없습니다. 설정 페이지에서 SMTP를 설정해주세요.')
  }

  return config
}

/**
 * DB에서 SMTP 설정을 로드합니다.
 * DB에 설정이 없으면 환경 변수를 fallback으로 사용합니다.
 */
async function loadSMTPConfigFromDB(): Promise<SMTPConfig | null> {
  try {
    const rows = await db
      .select()
      .from(settings)
      .where(eq(settings.key, SMTP_KEYS.host))
      .union(db.select().from(settings).where(eq(settings.key, SMTP_KEYS.port)))
      .union(db.select().from(settings).where(eq(settings.key, SMTP_KEYS.user)))
      .union(db.select().from(settings).where(eq(settings.key, SMTP_KEYS.pass)))
      .union(db.select().from(settings).where(eq(settings.key, SMTP_KEYS.fromName)))
      .union(db.select().from(settings).where(eq(settings.key, SMTP_KEYS.fromEmail)))

    if (rows.length === 0) {
      return null
    }

    const settingsMap = new Map(rows.map((r) => [r.key, r.value]))

    const host = settingsMap.get(SMTP_KEYS.host)
    const portStr = settingsMap.get(SMTP_KEYS.port)
    const user = settingsMap.get(SMTP_KEYS.user)
    const encryptedPass = settingsMap.get(SMTP_KEYS.pass)

    // 필수 설정이 없으면 null 반환
    if (!host || !user || !encryptedPass) {
      return null
    }

    const port = parseInt(portStr || '587', 10)
    const pass = decrypt(encryptedPass)
    const fromName = settingsMap.get(SMTP_KEYS.fromName) || ''
    const fromEmail = settingsMap.get(SMTP_KEYS.fromEmail) || user

    return {
      host,
      port,
      // 포트 465는 Implicit TLS (secure: true)
      // 포트 587은 STARTTLS (secure: false, requireTLS: true)
      secure: port === 465,
      requireTLS: port !== 465, // 465가 아닌 경우 STARTTLS 강제
      auth: { user, pass },
      fromName,
      fromEmail,
    }
  } catch {
    return null
  }
}
