import { bigint, boolean, customType, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import 'server-only'

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const manufacturer = pgTable('manufacturer', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  ccEmail: varchar('cc_email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  // 이메일 템플릿
  emailSubjectTemplate: text('email_subject_template'),
  emailBodyTemplate: text('email_body_template'),
  // 통계
  orderCount: integer('order_count').default(0),
  lastOrderDate: timestamp('last_order_date', { precision: 3, withTimezone: true }),
  // 타임스탬프
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

export const product = pgTable('product', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  productCode: varchar('product_code', { length: 255 }).notNull().unique(), // "상품코드" (사이트+쇼핑몰상품번호 기반)
  productName: varchar('product_name', { length: 500 }).notNull(),
  optionName: varchar('option_name', { length: 255 }),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' }).references(() => manufacturer.id, {
    onDelete: 'set null',
  }),
  price: integer('price').default(0),
  cost: integer('cost').default(0), // 원가
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

export const optionMapping = pgTable('option_mapping', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  productCode: varchar('product_code', { length: 255 }).notNull(), // "상품코드" (사이트+쇼핑몰상품번호 기반)
  optionName: varchar('option_name', { length: 255 }).notNull(),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' })
    .references(() => manufacturer.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 제조사별 발주서 템플릿 (Order Template)
// ============================================

export const orderTemplate = pgTable('order_template', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' })
    .references(() => manufacturer.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  templateFileName: varchar('template_file_name', { length: 255 }),
  templateFile: bytea('template_file'),
  headerRow: integer('header_row').default(1),
  dataStartRow: integer('data_start_row').default(2),
  columnMappings: text('column_mappings'), // JSON: { "recipientName": "D", "address": "F" }
  fixedValues: text('fixed_values'), // JSON: 고정값 설정 { "A": "다온에프앤씨", "B": "032-237-6933" }
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 공통 발주서 템플릿 (Common Order Template)
// 서버리스 환경에서 파일 시스템 대신 DB에 저장
// ============================================

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

// ============================================
// 송장 변환 템플릿 (Invoice Template)
// ============================================

export const invoiceTemplate = pgTable('invoice_template', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' })
    .references(() => manufacturer.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  orderNumberColumn: varchar('order_number_column', { length: 50 }).notNull(),
  courierColumn: varchar('courier_column', { length: 50 }).notNull(),
  trackingNumberColumn: varchar('tracking_number_column', { length: 50 }).notNull(),
  headerRow: integer('header_row').default(1),
  dataStartRow: integer('data_start_row').default(2),
  useColumnIndex: boolean('use_column_index').default(true),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()
