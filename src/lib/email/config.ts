// ============================================================================
// SMTP Configuration Types
// ============================================================================

/**
 * SMTP 계정 설정 (DB 저장용)
 */
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

// ============================================================================
// Constants
// ============================================================================

/**
 * 기본 SMTP 포트 (STARTTLS)
 */
export const SMTP_DEFAULT_PORT = 587

/**
 * 레거시 SMTP 설정 키 (마이그레이션 및 fallback용)
 * @deprecated 새 코드에서는 smtp_accounts 테이블을 사용하세요
 */
export const LEGACY_SMTP_KEYS = {
  fromName: 'smtp.fromName',
  host: 'smtp.host',
  pass: 'smtp.pass',
  user: 'smtp.user',
} as const

/**
 * SMTP 계정 용도별 기본 이름
 */
export const SMTP_PURPOSE_LABELS: Record<SMTPAccountPurpose, string> = {
  system: '시스템 알림',
  order: '발주서 발송',
}
