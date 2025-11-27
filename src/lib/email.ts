import type { Attachment } from 'nodemailer/lib/mailer'

import nodemailer from 'nodemailer'

import { env } from '@/lib/env'

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
  host: string
  port: number
  secure: boolean
}

/**
 * 이메일 발송 함수
 * @param options 이메일 발송 옵션 (수신자, 제목, 내용, 첨부파일 등)
 * @returns 발송 결과
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const transporter = createTransporter()
    const from = getFromAddress()

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
  manufacturerName: string,
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
    const transporter = createTransporter()

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
function createTransporter() {
  const config = getSMTPConfig()

  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  })
}

// 발신자 정보 가져오기
function getFromAddress(): string {
  const fromName = env.SMTP_FROM_NAME || ''
  const fromEmail = env.SMTP_FROM_EMAIL || env.SMTP_USER

  return fromName ? `"${fromName}" <${fromEmail}>` : fromEmail
}

// 환경변수에서 SMTP 설정 가져오기
function getSMTPConfig(): SMTPConfig {
  return {
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465, // 465 포트는 SSL, 587은 TLS(STARTTLS)
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  }
}
