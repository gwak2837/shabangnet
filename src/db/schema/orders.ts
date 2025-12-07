import { bigint, decimal, integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import 'server-only'

import { emailStatusEnum, orderStatusEnum, uploadTypeEnum } from './enums'
import { manufacturer } from './manufacturers'
import { shoppingMallTemplate } from './settings'

// ============================================
// 업로드 기록 (Upload)
// ============================================

export const upload = pgTable('upload', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileSize: integer('file_size').default(0),
  fileType: uploadTypeEnum('file_type').default('sabangnet'), // 파일 유형
  shoppingMallId: bigint('shopping_mall_id', { mode: 'number' }).references(() => shoppingMallTemplate.id), // 쇼핑몰 템플릿
  totalOrders: integer('total_orders').default(0),
  processedOrders: integer('processed_orders').default(0),
  errorOrders: integer('error_orders').default(0),
  status: varchar('status', { length: 50 }).default('processing'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 주문 데이터 (Order) - 실제 주문 저장
// ============================================

export const order = pgTable('order', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  uploadId: bigint('upload_id', { mode: 'number' }).references(() => upload.id),
  orderNumber: varchar('order_number', { length: 100 }).notNull().unique(),
  productName: varchar('product_name', { length: 500 }),
  quantity: integer('quantity').default(1),
  orderName: varchar('order_name', { length: 255 }), // 주문인
  recipientName: varchar('recipient_name', { length: 255 }), // 받는인
  orderPhone: varchar('order_phone', { length: 50 }), // 주문인 연락처
  orderMobile: varchar('order_mobile', { length: 50 }), // 주문인 핸드폰
  recipientPhone: varchar('recipient_phone', { length: 50 }), // 받는인 연락처
  recipientMobile: varchar('recipient_mobile', { length: 50 }), // 받는인 핸드폰
  postalCode: varchar('postal_code', { length: 20 }), // 우편번호
  address: text('address'), // 배송지
  memo: text('memo'), // 전언/배송메시지
  shoppingMall: varchar('shopping_mall', { length: 100 }), // 쇼핑몰/사이트
  manufacturerName: varchar('manufacturer_name', { length: 255 }), // 제조사 (원본)
  courier: varchar('courier', { length: 100 }), // 택배사
  trackingNumber: varchar('tracking_number', { length: 100 }), // 송장번호
  optionName: varchar('option_name', { length: 255 }), // 옵션
  paymentAmount: decimal('payment_amount', { precision: 12, scale: 2 }), // 결제금액
  productAbbr: varchar('product_abbr', { length: 255 }), // 상품약어
  productCode: varchar('product_code', { length: 100 }), // 품번코드/자체상품코드
  cost: decimal('cost', { precision: 12, scale: 2 }), // 원가
  shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }).default('0'), // 택배비
  // 시스템 필드
  manufacturerId: bigint('manufacturer_id', { mode: 'number' }).references(() => manufacturer.id),
  status: orderStatusEnum('status').default('pending'),
  excludedReason: varchar('excluded_reason', { length: 255 }), // 발송 제외 사유
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 발주서 이메일 발송 로그 (Order Email Log)
// ============================================

export const orderEmailLog = pgTable('order_email_log', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' }).references(() => manufacturer.id),
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
}).enableRLS()

// ============================================
// 발주서 이메일 발송 로그 상세 (Order Email Log Item)
// 발송에 포함된 주문 상세
// ============================================

export const orderEmailLogItem = pgTable('order_email_log_item', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  emailLogId: bigint('email_log_id', { mode: 'number' })
    .references(() => orderEmailLog.id)
    .notNull(),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  productName: varchar('product_name', { length: 500 }).notNull(),
  optionName: varchar('option_name', { length: 255 }),
  quantity: integer('quantity').default(1),
  price: decimal('price', { precision: 12, scale: 2 }).default('0'),
  cost: decimal('cost', { precision: 12, scale: 2 }).default('0'), // 발주 시점 원가
  shippingCost: decimal('shipping_cost', { precision: 12, scale: 2 }).default('0'), // 발주 시점 택배비
  customerName: varchar('customer_name', { length: 255 }),
  address: text('address'),
}).enableRLS()
