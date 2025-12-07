import 'server-only'

import type { Attachment } from 'nodemailer/lib/mailer'

import { eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { smtpAccount } from '@/db/schema/settings'
import { formatFromAddress } from '@/lib/email/common'
import { decrypt } from '@/utils/crypto'

import { createTransporter } from './transporter'

export interface SendEmailOptions {
  /** 첨부파일 */
  attachments?: Attachment[]
  /** 참조 수신자 */
  cc?: string | string[]
  /** 발신자 이메일 */
  fromEmail: string
  /** 발신자 이름 */
  fromName: string
  /** HTML 본문 */
  html?: string
  /** 이메일 제목 */
  subject: string
  /** 텍스트 본문 */
  text?: string
  /** 수신자 이메일 (단일 또는 배열) */
  to: string | string[]
}

export async function getSMTPAccount(email: string) {
  const [account] = await db
    .select({
      email: smtpAccount.email,
      password: smtpAccount.password,
      host: smtpAccount.host,
      enabled: smtpAccount.enabled,
      fromName: smtpAccount.fromName,
    })
    .from(smtpAccount)
    .where(eq(smtpAccount.email, email))

  if (!account || !account.enabled) {
    return
  }

  return {
    email: account.email,
    password: decrypt(account.password),
    host: account.host,
    fromName: account.fromName,
  }
}

export async function sendEmail(options: SendEmailOptions) {
  const recipients = Array.isArray(options.to) ? options.to : [options.to]
  const ccRecipients = options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined
  const account = await getSMTPAccount(options.fromEmail)

  if (!account) {
    return
  }

  const transporter = await createTransporter(account)

  if (!transporter) {
    return
  }

  if (process.env.NODE_ENV === 'test') {
    return { messageId: `test-mock-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` }
  }

  const info = await transporter.sendMail({
    from: formatFromAddress(options.fromEmail, options.fromName),
    to: recipients.join(', '),
    cc: ccRecipients?.join(', '),
    subject: options.subject,
    text: options.text,
    html: options.html,
    attachments: options.attachments,
  })

  return { messageId: info.messageId }
}

export async function testSMTPConnection(email: string) {
  const account = await getSMTPAccount(email)

  if (!account) {
    return
  }

  const transporter = await createTransporter(account)

  if (!transporter) {
    return
  }

  return await transporter.verify()
}
