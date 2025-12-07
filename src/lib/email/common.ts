export interface SMTPAccount {
  createdAt: Date
  enabled: boolean
  fromName: string
  host: string
  id: string
  isDefault: boolean
  name: string
  password: string // 암호화된 상태로 저장
  port: number
  purpose: SMTPAccountPurpose
  updatedAt: Date
  username: string
}

/**
 * SMTP 계정 표시용 (비밀번호 마스킹)
 */
export interface SMTPAccountDisplay extends Omit<SMTPAccount, 'password'> {
  hasPassword: boolean
  maskedPassword: string
}

export interface SMTPAccountFormData {
  email: string
  enabled: boolean
  fromName: string
  host: string
  name: string
  password: string
  port: number
}

/**
 * SMTP 계정 생성 입력
 */
export type SMTPAccountInput = Omit<SMTPAccount, 'createdAt' | 'id' | 'updatedAt'>

/**
 * SMTP 계정 용도 구분
 * - system: 시스템 알림 (인증, 비밀번호 재설정 등)
 * - order: 발주서 발송
 */
export type SMTPAccountPurpose = 'order' | 'system'

/**
 * SMTP 연결에 필요한 설정
 */
export interface SMTPConnectionConfig {
  auth: {
    user: string
    pass: string
  }
  fromEmail: string
  fromName: string
  host: string
  port: number
}

export const SMTP_DEFAULT_PORT = 587

export function formatFromAddress(fromEmail: string, fromName: string): string {
  return fromName ? `"${fromName}" <${fromEmail}>` : fromEmail
}
