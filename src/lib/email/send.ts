import 'server-only'

import type { Attachment } from 'nodemailer/lib/mailer'

import { Transporter } from 'nodemailer'
import Mail from 'nodemailer/lib/mailer'

import type { SMTPAccountPurpose } from './config'

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
  /** SMTP 계정 용도 (기본: system) */
  purpose?: SMTPAccountPurpose
  /** 이메일 제목 */
  subject: string
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

export async function sendOrderEmail(
  manufacturerEmail: string,
  subject: string,
  body: string,
  attachments?: Attachment[],
): Promise<SendEmailResult> {
  return sendEmail({
    to: manufacturerEmail,
    subject,
    html: body,
    attachments,
    purpose: 'order',
  })
}

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

async function sendTransporterEmail(transporter: Transporter, mailOptions: Mail.Options) {
  if (process.env.NODE_ENV === 'test') {
    return {
      messageId: `test-mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    }
  }

  return await transporter.sendMail(mailOptions)
}
