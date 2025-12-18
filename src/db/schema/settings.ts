import { bigint, boolean, customType, integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import 'server-only'

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
  description: text('description'),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}).enableRLS()

export const shoppingMallTemplate = pgTable('shopping_mall_template', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  mallName: varchar('mall_name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  columnMappings: text('column_mappings'), // JSON: 쇼핑몰 컬럼 -> 사방넷 컬럼 연결
  exportConfig: text('export_config'), // JSON: 쇼핑몰 원본 -> 다운로드 엑셀 컬럼 연결(순서 포함)
  headerRow: integer('header_row').default(1),
  dataStartRow: integer('data_start_row').default(2),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}).enableRLS()

export const commonOrderTemplate = pgTable('common_order_template', {
  key: varchar('key', { length: 50 }).primaryKey(), // e.g. "default"
  templateFileName: varchar('template_file_name', { length: 255 }).notNull(),
  templateFile: bytea('template_file').notNull(),
  headerRow: integer('header_row').default(1).notNull(),
  dataStartRow: integer('data_start_row').default(2).notNull(),
  columnMappings: text('column_mappings').notNull(), // JSON: sabangnetKey -> columnLetter
  fixedValues: text('fixed_values'), // JSON: { "A": "{{manufacturerName}}", "FIELD:orderName": "{{orderName || recipientName}}" }
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

export const courierMapping = pgTable('courier_mapping', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  aliases: text('aliases').array(), // 별칭 배열
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

export const exclusionPattern = pgTable('exclusion_pattern', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  pattern: varchar('pattern', { length: 255 }).notNull().unique(),
  description: text('description'),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}).enableRLS()

export const smtpAccount = pgTable('smtp_account', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 100 }).notNull(),
  host: varchar('host', { length: 255 }).notNull(),
  port: integer('port').default(587).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password').notNull(), // 암호화됨
  fromName: varchar('from_name', { length: 100 }),
  isDefault: boolean('is_default').default(false),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}).enableRLS()

export const emailTemplate = pgTable('email_template', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  slug: varchar('slug', { length: 50 }).notNull().unique(), // "order-default"
  subject: text('subject').notNull(), // "{{manufacturer_name}} 발주서 - {{date}}"
  body: text('body').notNull(), // HTML 템플릿
  variables: jsonb('variables'), // 사용 가능한 변수 목록 { key: description }
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
}).enableRLS()
