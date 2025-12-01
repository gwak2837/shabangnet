import { boolean, decimal, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'

// ============================================
// 제조사 (Manufacturers)
// ============================================

export const manufacturers = pgTable('manufacturers', {
  id: text('id').primaryKey(),
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
})

// ============================================
// 상품 (Products) - 상품-제조사 매핑
// ============================================

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  productCode: varchar('product_code', { length: 100 }).notNull().unique(),
  productName: varchar('product_name', { length: 500 }).notNull(),
  optionName: varchar('option_name', { length: 255 }),
  manufacturerId: text('manufacturer_id').references(() => manufacturers.id),
  price: decimal('price', { precision: 12, scale: 2 }).default('0'),
  cost: decimal('cost', { precision: 12, scale: 2 }).default('0'), // 원가
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================
// 옵션-제조사 매핑 (Option Manufacturer Mappings)
// 같은 상품코드라도 옵션에 따라 다른 제조사에서 공급되는 경우
// ============================================

export const optionMappings = pgTable('option_mappings', {
  id: text('id').primaryKey(),
  productCode: varchar('product_code', { length: 100 }).notNull(),
  optionName: varchar('option_name', { length: 255 }).notNull(),
  manufacturerId: text('manufacturer_id')
    .references(() => manufacturers.id)
    .notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================
// 제조사별 발주서 템플릿 (Order Templates)
// ============================================

export const orderTemplates = pgTable('order_templates', {
  id: text('id').primaryKey(),
  manufacturerId: text('manufacturer_id')
    .references(() => manufacturers.id)
    .notNull()
    .unique(),
  templateFileName: varchar('template_file_name', { length: 255 }),
  headerRow: integer('header_row').default(1),
  dataStartRow: integer('data_start_row').default(2),
  columnMappings: text('column_mappings'), // JSON: { "recipientName": "D", "address": "F" }
  fixedValues: text('fixed_values'), // JSON: 고정값 설정 { "A": "다온에프앤씨", "B": "032-237-6933" }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================
// 송장 변환 템플릿 (Invoice Templates)
// ============================================

export const invoiceTemplates = pgTable('invoice_templates', {
  id: text('id').primaryKey(),
  manufacturerId: text('manufacturer_id')
    .references(() => manufacturers.id)
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
})
