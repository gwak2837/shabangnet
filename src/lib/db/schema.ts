import { pgTable, text, integer, boolean, timestamp, varchar, decimal, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================
// Enums
// ============================================

export const orderStatusEnum = pgEnum('order_status', ['pending', 'processing', 'completed', 'error'])
export const emailStatusEnum = pgEnum('email_status', ['success', 'failed', 'pending'])

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
    '안녕하세요. (주)다온에프앤씨 발주 첨부파일 드립니다. 감사합니다.'
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
// 이메일 발송 로그 (Email Logs)
// ============================================

export const emailLogs = pgTable('email_logs', {
  id: text('id').primaryKey(),
  manufacturerId: text('manufacturer_id').references(() => manufacturers.id),
  manufacturerName: varchar('manufacturer_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: text('subject').notNull(),
  fileName: varchar('file_name', { length: 500 }),
  orderCount: integer('order_count').default(0),
  totalAmount: decimal('total_amount', { precision: 15, scale: 2 }).default('0'),
  status: emailStatusEnum('status').default('pending').notNull(),
  errorMessage: text('error_message'),
  // 중복 발송 관련
  recipientAddresses: text('recipient_addresses').array(), // 수취인 주소 배열
  duplicateReason: text('duplicate_reason'), // 중복 발송 시 입력한 사유
  // 발송 정보
  sentAt: timestamp('sent_at', { withTimezone: true }),
  sentBy: varchar('sent_by', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
})

// ============================================
// 이메일 발송 로그 상세 (Email Log Orders)
// 발송에 포함된 주문 상세
// ============================================

export const emailLogOrders = pgTable('email_log_orders', {
  id: text('id').primaryKey(),
  emailLogId: text('email_log_id')
    .references(() => emailLogs.id)
    .notNull(),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  productName: varchar('product_name', { length: 500 }).notNull(),
  optionName: varchar('option_name', { length: 255 }),
  quantity: integer('quantity').default(1),
  price: decimal('price', { precision: 12, scale: 2 }).default('0'),
  cost: decimal('cost', { precision: 12, scale: 2 }).default('0'), // 발주 시점 원가
  customerName: varchar('customer_name', { length: 255 }),
  address: text('address'),
})

// ============================================
// 업로드 기록 (Uploads)
// ============================================

export const uploads = pgTable('uploads', {
  id: text('id').primaryKey(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileSize: integer('file_size').default(0),
  totalOrders: integer('total_orders').default(0),
  processedOrders: integer('processed_orders').default(0),
  errorOrders: integer('error_orders').default(0),
  status: varchar('status', { length: 50 }).default('processing'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
})

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
})

// ============================================
// 설정 (Settings)
// ============================================

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: text('value'),
  description: text('description'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

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

// ============================================
// Relations (관계 정의)
// ============================================

export const manufacturersRelations = relations(manufacturers, ({ many }) => ({
  products: many(products),
  optionMappings: many(optionMappings),
  emailLogs: many(emailLogs),
  invoiceTemplate: many(invoiceTemplates),
}))

export const productsRelations = relations(products, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [products.manufacturerId],
    references: [manufacturers.id],
  }),
}))

export const optionMappingsRelations = relations(optionMappings, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [optionMappings.manufacturerId],
    references: [manufacturers.id],
  }),
}))

export const emailLogsRelations = relations(emailLogs, ({ one, many }) => ({
  manufacturer: one(manufacturers, {
    fields: [emailLogs.manufacturerId],
    references: [manufacturers.id],
  }),
  orders: many(emailLogOrders),
}))

export const emailLogOrdersRelations = relations(emailLogOrders, ({ one }) => ({
  emailLog: one(emailLogs, {
    fields: [emailLogOrders.emailLogId],
    references: [emailLogs.id],
  }),
}))

export const invoiceTemplatesRelations = relations(invoiceTemplates, ({ one }) => ({
  manufacturer: one(manufacturers, {
    fields: [invoiceTemplates.manufacturerId],
    references: [manufacturers.id],
  }),
}))

// ============================================
// Type Exports
// ============================================

export type Manufacturer = typeof manufacturers.$inferSelect
export type NewManufacturer = typeof manufacturers.$inferInsert

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

export type OptionMapping = typeof optionMappings.$inferSelect
export type NewOptionMapping = typeof optionMappings.$inferInsert

export type EmailLog = typeof emailLogs.$inferSelect
export type NewEmailLog = typeof emailLogs.$inferInsert

export type EmailLogOrder = typeof emailLogOrders.$inferSelect
export type NewEmailLogOrder = typeof emailLogOrders.$inferInsert

export type Upload = typeof uploads.$inferSelect
export type NewUpload = typeof uploads.$inferInsert

export type ExclusionPattern = typeof exclusionPatterns.$inferSelect
export type NewExclusionPattern = typeof exclusionPatterns.$inferInsert

export type CourierMapping = typeof courierMappings.$inferSelect
export type NewCourierMapping = typeof courierMappings.$inferInsert

export type InvoiceTemplate = typeof invoiceTemplates.$inferSelect
export type NewInvoiceTemplate = typeof invoiceTemplates.$inferInsert

