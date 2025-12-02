// Re-exports for backward compatibility and convenience
export type {
  SMTPAccount,
  SMTPAccountDisplay,
  SMTPAccountInput,
  SMTPAccountPurpose,
  SMTPConnectionConfig,
} from './config'
export { LEGACY_SMTP_KEYS, SMTP_DEFAULT_PORT, SMTP_PURPOSE_LABELS } from './config'

export type { CreateEmailLogInput, EmailLogEntry, EmailLogFilter, EmailLogStatus } from './logging'
export { cleanupOldEmailLogs, createEmailLog, getEmailLogs, updateEmailLog } from './logging'

export type { SendEmailOptions, SendEmailResult } from './send'

export { sendEmail, sendOrderEmail, testSMTPConnection } from './send'
export type { EmailTemplate, EmailTemplateInput, OrderTemplateVariables, TemplateRenderResult } from './templates'

export {
  createEmailTemplate,
  deleteEmailTemplate,
  ensureDefaultOrderTemplate,
  getEmailTemplateBySlug,
  getEmailTemplates,
  ORDER_TEMPLATE_VARIABLES,
  renderOrderEmailTemplate,
  renderTemplate,
  updateEmailTemplate,
} from './templates'
export { createTransporter, formatFromAddress, loadSMTPConfig } from './transporter'
