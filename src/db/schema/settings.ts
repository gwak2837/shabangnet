import { boolean, index, integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

// ============================================
// 설정 (Settings)
// ============================================

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 택배사 코드 매핑 (Courier Mappings)
// ============================================

export const courierMappings = pgTable('courier_mappings', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  aliases: text('aliases').array(), // 별칭 배열
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 발송 제외 패턴 (Exclusion Patterns)
// ============================================

export const exclusionPatterns = pgTable('exclusion_patterns', {
  id: text('id').primaryKey(),
  pattern: varchar('pattern', { length: 255 }).notNull(),
  description: text('description'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 쇼핑몰별 파일 템플릿 (Shopping Mall Templates)
// ============================================

export const shoppingMallTemplates = pgTable('shopping_mall_templates', {
  id: text('id').primaryKey(),
  mallName: varchar('mall_name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  columnMappings: text('column_mappings'), // JSON: 쇼핑몰 컬럼 -> 사방넷 컬럼 매핑
  headerRow: integer('header_row').default(1),
  dataStartRow: integer('data_start_row').default(2),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// SMTP 계정 (SMTP Accounts)
// ============================================

export const smtpAccounts = pgTable('smtp_accounts', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(), // "시스템 알림", "발주서 발송"
  purpose: varchar('purpose', { length: 50 }).notNull().unique(), // "system" | "order"
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port').default(587).notNull(),
  username: varchar('username', { length: 255 }).notNull(),
  password: text('password').notNull(), // 암호화됨
  fromName: varchar('from_name', { length: 100 }),
  isDefault: boolean('is_default').default(false),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 이메일 템플릿 (Email Templates)
// ============================================

export const emailTemplates = pgTable('email_templates', {
  id: text('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(), // "발주서 기본"
  slug: varchar('slug', { length: 50 }).notNull().unique(), // "order-default"
  subject: text('subject').notNull(), // "{{manufacturer_name}} 발주서 - {{date}}"
  body: text('body').notNull(), // HTML 템플릿
  variables: jsonb('variables'), // 사용 가능한 변수 목록 { key: description }
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 이메일 발송 로그 (Email Logs)
// ============================================

export const emailLogs = pgTable(
  'email_logs',
  {
    id: text('id').primaryKey(),
    smtpAccountId: text('smtp_account_id').references(() => smtpAccounts.id),
    templateId: text('template_id').references(() => emailTemplates.id),
    recipient: varchar('recipient', { length: 255 }).notNull(),
    cc: text('cc').array(),
    subject: varchar('subject', { length: 500 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // "sent" | "failed" | "pending"
    errorMessage: text('error_message'),
    messageId: varchar('message_id', { length: 255 }), // SMTP 응답의 messageId
    metadata: jsonb('metadata'), // 관련 정보 (order_id, manufacturer_id 등)
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_email_logs_recipient').on(table.recipient),
    index('idx_email_logs_status').on(table.status),
    index('idx_email_logs_sent_at').on(table.sentAt),
  ],
).enableRLS()
