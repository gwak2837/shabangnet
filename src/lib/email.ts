export { LEGACY_SMTP_KEYS } from './email/config'
/**
 * @deprecated 이 파일은 하위 호환성을 위해 유지됩니다.
 * 새 코드에서는 '@/lib/email' 대신 '@/lib/email/send' 또는 '@/lib/email/config'를 직접 임포트하세요.
 */
export type { SendEmailOptions, SendEmailResult } from './email/send'
export { sendEmail, sendOrderEmail, testSMTPConnection } from './email/send'
