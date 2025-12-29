import { sql } from 'drizzle-orm'
import { bigint, customType, date, index, integer, jsonb, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core'
import 'server-only'

import { emailStatusEnum, orderStatusEnum, uploadTypeEnum } from './enums'
import { manufacturer } from './manufacturers'
import { shoppingMallTemplate } from './settings'

// tsvector 타입 정의 (Full-text Search용)
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

export const upload = pgTable('upload', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  fileName: varchar('file_name', { length: 500 }).notNull(),
  fileSize: integer('file_size').default(0),
  fileType: uploadTypeEnum('file_type').default('sabangnet'), // 파일 유형
  shoppingMallId: bigint('shopping_mall_id', { mode: 'number' }).references(() => shoppingMallTemplate.id), // 쇼핑몰 템플릿
  meta: jsonb('meta'), // JSON: 업로드 결과 메타(요약/오류 샘플 등). 원본/산출물 파일은 저장하지 않아요.
  totalOrders: integer('total_orders').default(0),
  processedOrders: integer('processed_orders').default(0),
  errorOrders: integer('error_orders').default(0),
  status: varchar('status', { length: 50 }).default('processing'),
  uploadedAt: timestamp('uploaded_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// 사방넷 주문 파일, 쇼핑몰 주문 파일 데이터
export const order = pgTable(
  'order',
  {
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
    uploadId: bigint('upload_id', { mode: 'number' }).references(() => upload.id, { onDelete: 'cascade' }),

    // ============================================
    // 주문 식별자 (Order Identifiers)
    // ============================================
    sabangnetOrderNumber: varchar('sabangnet_order_number', { length: 100 }).notNull().unique(), // Q열: 사방넷주문번호 (UNIQUE KEY)
    mallOrderNumber: varchar('mall_order_number', { length: 100 }), // P열: 쇼핑몰주문번호
    subOrderNumber: varchar('sub_order_number', { length: 100 }), // Z열: 부주문번호

    // ============================================
    // 상품 정보 (Product Info)
    // ============================================
    productName: varchar('product_name', { length: 500 }), // A열: 상품명
    quantity: integer('quantity').default(1), // B열: 수량
    optionName: varchar('option_name', { length: 255 }), // S열: 옵션
    productAbbr: varchar('product_abbr', { length: 255 }), // V열: 상품약어
    productCode: varchar('product_code', { length: 255 }), // "상품코드" (사이트+쇼핑몰상품번호 기반)
    mallProductNumber: varchar('mall_product_number', { length: 100 }), // R열: 쇼핑몰상품번호
    modelNumber: varchar('model_number', { length: 100 }), // ]열: 모델번호

    // ============================================
    // 주문자/수취인 (Orderer/Recipient)
    // ============================================
    orderName: varchar('order_name', { length: 255 }), // C열: 주문인
    recipientName: varchar('recipient_name', { length: 255 }), // D열: 받는인
    orderPhone: varchar('order_phone', { length: 50 }), // E열: 주문인 연락처
    orderMobile: varchar('order_mobile', { length: 50 }), // F열: 주문인 핸드폰
    recipientPhone: varchar('recipient_phone', { length: 50 }), // G열: 받는인 연락처
    recipientMobile: varchar('recipient_mobile', { length: 50 }), // H열: 받는인 핸드폰

    // ============================================
    // 배송 정보 (Shipping)
    // ============================================
    postalCode: varchar('postal_code', { length: 20 }), // I열: 우편번호
    address: text('address'), // J열: 배송지
    memo: text('memo'), // K열: 전언
    courier: varchar('courier', { length: 100 }), // N열: 택배사
    trackingNumber: varchar('tracking_number', { length: 100 }), // O열: 송장번호
    logisticsNote: text('logistics_note'), // X열: 물류전달사항

    // ============================================
    // 소스/제조사 (Source/Manufacturer)
    // ============================================
    shoppingMall: varchar('shopping_mall', { length: 100 }), // L열: 사이트
    manufacturerName: varchar('manufacturer_name', { length: 255 }), // M열: 제조사
    manufacturerId: bigint('manufacturer_id', { mode: 'number' }).references(() => manufacturer.id, {
      onDelete: 'set null',
    }),

    // ============================================
    // 금액 (Amounts)
    // ============================================
    paymentAmount: integer('payment_amount').default(0), // U열: 결제금액
    cost: integer('cost').default(0), // ^열: 원가(상품)*수량
    shippingCost: integer('shipping_cost').default(0), // 택배비

    // ============================================
    // 주문 메타 (Order Meta)
    // ============================================
    fulfillmentType: varchar('fulfillment_type', { length: 50 }), // T열: F (주문유형)
    cjDate: date('cj_date', { mode: 'date' }), // W열: 씨제이날짜
    collectedAt: timestamp('collected_at', { precision: 3, withTimezone: true }), // Y열: 수집일시

    // ============================================
    // 시스템 필드 (System)
    // ============================================
    status: orderStatusEnum('status').default('pending'),
    createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),

    // Full-text Search용 generated column
    // 'simple' 설정: 형태소 분석 없이 공백 기준 토큰화 (한글에 적합)
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`to_tsvector('simple', coalesce(sabangnet_order_number, '') || ' ' || coalesce(mall_order_number, '') || ' ' || coalesce(product_name, '') || ' ' || coalesce(recipient_name, '') || ' ' || coalesce(manufacturer_name, ''))`,
    ),
  },
  (table) => [
    // Full-text Search용 GIN 인덱스
    index('order_search_idx').using('gin', table.searchVector),
    // Cursor pagination용 인덱스
    index('order_manufacturer_id_idx').on(table.manufacturerId),
  ],
).enableRLS()

// ============================================
// 발주서 이메일 발송 로그 (Order Email Log)
// ============================================

export const orderEmailLog = pgTable('order_email_log', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  manufacturerId: bigint('manufacturer_id', { mode: 'number' }).references(() => manufacturer.id, {
    onDelete: 'set null',
  }),
  manufacturerName: varchar('manufacturer_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  subject: text('subject').notNull(),
  fileName: varchar('file_name', { length: 500 }),
  attachmentFile: bytea('attachment_file'), // 발송 시점에 생성된 발주서 XLSX(원본) 저장
  attachmentFileSize: integer('attachment_file_size'), // bytes
  orderCount: integer('order_count').default(0),
  totalAmount: bigint('total_amount', { mode: 'number' }).default(0),
  status: emailStatusEnum('status').default('pending').notNull(),
  errorMessage: text('error_message'),
  // 중복 발송 관련
  recipientAddresses: text('recipient_addresses').array(), // 수취인 주소 배열
  duplicateReason: text('duplicate_reason'), // 중복 발송 시 입력한 사유
  // 발송 정보
  sentAt: timestamp('sent_at', { precision: 3, withTimezone: true }),
  sentBy: varchar('sent_by', { length: 255 }),
  createdAt: timestamp('created_at', { precision: 3, withTimezone: true }).defaultNow().notNull(),
}).enableRLS()

// ============================================
// 발주서 이메일 발송 로그 상세 (Order Email Log Item)
// 발송에 포함된 주문 상세
// ============================================

export const orderEmailLogItem = pgTable('order_email_log_item', {
  id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  emailLogId: bigint('email_log_id', { mode: 'number' })
    .references(() => orderEmailLog.id, { onDelete: 'cascade' })
    .notNull(),
  sabangnetOrderNumber: varchar('sabangnet_order_number', { length: 100 }).notNull(),
  productName: varchar('product_name', { length: 500 }).notNull(),
  optionName: varchar('option_name', { length: 255 }),
  quantity: integer('quantity').default(1),
  price: integer('price').default(0),
  cost: integer('cost').default(0), // 발주 시점 원가
  shippingCost: integer('shipping_cost').default(0), // 발주 시점 택배비
  customerName: varchar('customer_name', { length: 255 }),
  address: text('address'),
}).enableRLS()
