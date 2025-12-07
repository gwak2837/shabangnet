import { bigint, boolean, decimal, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import 'server-only'

// ============================================
// 제조사 (Manufacturer)
// ============================================

export const manufacturer = pgTable('manufacturer', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull(),
  ccEmail: varchar('cc_email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  // 이메일 템플릿
  emailSubjectTemplate: text('email_subject_template').default('[다온에프앤씨 발주서]_{제조사명}_{날짜}'),
  emailBodyTemplate: text('email_body_template').default(
    '안녕하세요. (주)다온에프앤씨 발주 첨부파일 드립니다. 감사합니다.',
  ),
  // 통계
  orderCount: integer('order_count').default(0),
  lastOrderDate: timestamp('last_order_date', { withTimezone: true }),
  // 타임스탬프
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 상품 (Product) - 상품-제조사 매핑
// ============================================

export const product = pgTable('product', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  productCode: varchar('product_code', { length: 100 }).notNull().unique(),
  productName: varchar('product_name', { length: 500 }).notNull(),
  optionName: varchar('option_name', { length: 255 }),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' }).references(() => manufacturer.id, {
    onDelete: 'set null',
  }),
  price: decimal('price', { precision: 12, scale: 2 }).default('0'),
  cost: decimal('cost', { precision: 12, scale: 2 }).default('0'), // 원가
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 옵션-제조사 매핑 (Option Mapping)
// 같은 상품코드라도 옵션에 따라 다른 제조사에서 공급되는 경우
// ============================================

export const optionMapping = pgTable('option_mapping', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  productCode: varchar('product_code', { length: 100 }).notNull(),
  optionName: varchar('option_name', { length: 255 }).notNull(),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' })
    .references(() => manufacturer.id, { onDelete: 'cascade' })
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
  headerRow: integer('header_row').default(1),
  dataStartRow: integer('data_start_row').default(2),
  columnMappings: text('column_mappings'), // JSON: { "recipientName": "D", "address": "F" }
  fixedValues: text('fixed_values'), // JSON: 고정값 설정 { "A": "다온에프앤씨", "B": "032-237-6933" }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()
