import 'server-only'

import type { Attachment } from 'nodemailer/lib/mailer'

import { Transporter } from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'

import type { SMTPAccountPurpose } from './config'

import { createEmailLog, CreateEmailLogInput, getSmtpAccountIdByPurpose } from './logging'
import { createTransporter, formatFromAddress, loadSMTPConfig } from './transporter'

// ============================================================================
// Types
// ============================================================================

/**
 * 이메일 발송 옵션
 */
export interface SendEmailOptions {
  /** 첨부파일 */
  attachments?: Attachment[]
  /** 참조 수신자 */
  cc?: string | string[]
  /** HTML 본문 */
  html?: string
  /** 메타데이터 (로그용) */
  metadata?: Record<string, unknown>
  /** SMTP 계정 용도 (기본: system) */
  purpose?: SMTPAccountPurpose
  /** 로그 비활성화 (기본: false) */
  skipLogging?: boolean
  /** 이메일 제목 */
  subject: string
  /** 템플릿 ID (로그용) */
  templateId?: string
  /** 텍스트 본문 */
  text?: string
  /** 수신자 이메일 (단일 또는 배열) */
  to: string | string[]
}

/**
 * 이메일 발송 결과
 */
export interface SendEmailResult {
  error?: string
  logId?: string
  messageId?: string
  success: boolean
}

// ============================================================================
// Send Functions
// ============================================================================

/**
 * 이메일을 발송합니다.
 * @param options 이메일 발송 옵션
 * @returns 발송 결과
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const purpose = options.purpose || 'system'
  const recipients = Array.isArray(options.to) ? options.to : [options.to]
  const ccRecipients = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined

  // SMTP 계정 ID 조회 (로그용)
  let smtpAccountId: string | null = null
  if (!options.skipLogging) {
    smtpAccountId = await getSmtpAccountIdByPurpose(purpose)
  }

  try {
    const transporter = await createTransporter(purpose)
    const config = await loadSMTPConfig(purpose)

    const info = await sendTransporterEmail(transporter, {
      from: formatFromAddress(config),
      to: recipients.join(', '),
      cc: ccRecipients?.join(', '),
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    })

    const log = await createEmailLogEntry({
      skipLogging: options.skipLogging,
      smtpAccountId: smtpAccountId || undefined,
      templateId: options.templateId,
      recipient: recipients.join(', '),
      cc: ccRecipients,
      subject: options.subject,
      status: 'sent',
      messageId: info.messageId,
      metadata: options.metadata,
      sentAt: new Date(),
    })

    return {
      success: true,
      messageId: info.messageId,
      logId: log.id,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'

    const log = await createEmailLogEntry({
      skipLogging: options.skipLogging,
      smtpAccountId: smtpAccountId || undefined,
      templateId: options.templateId,
      recipient: recipients.join(', '),
      cc: ccRecipients,
      subject: options.subject,
      status: 'failed',
      errorMessage,
      metadata: options.metadata,
    })

    return {
      success: false,
      error: errorMessage,
      logId: log.id,
    }
  }
}

/**
 * 발주서 이메일을 발송합니다.
 * @param manufacturerEmail 제조사 이메일
 * @param subject 메일 제목
 * @param body 메일 본문 (HTML)
 * @param attachments 첨부파일
 * @param metadata 추가 메타데이터 (제조사 ID, 발주서 ID 등)
 */
export async function sendOrderEmail(
  manufacturerEmail: string,
  subject: string,
  body: string,
  attachments?: Attachment[],
  metadata?: Record<string, unknown>,
): Promise<SendEmailResult> {
  return sendEmail({
    to: manufacturerEmail,
    subject,
    html: body,
    attachments,
    purpose: 'order',
    metadata,
  })
}

/**
 * SMTP 연결을 테스트합니다.
 * @param purpose SMTP 계정 용도
 * @returns 연결 성공 여부
 */
export async function testSMTPConnection(
  purpose: SMTPAccountPurpose = 'system',
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = await createTransporter(purpose)
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

async function createEmailLogEntry(options: CreateEmailLogInput & { skipLogging?: boolean }) {
  if (options.skipLogging) {
    return { id: '' }
  }

  return await createEmailLog(options)
}

async function sendTransporterEmail(transporter: Transporter, mailOptions: Mail.Options) {
  if (process.env.NODE_ENV === 'test') {
    return {
      messageId: `test-mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }
  }

  return await transporter.sendMail(mailOptions)
}
