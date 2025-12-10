import './server-only'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { shoppingMallTemplate } from '../src/db/schema/settings'

/**
 * 쇼핑몰 템플릿 시드 데이터
 *
 * 실제 엑셀 파일 분석 결과 기반 (2025-12-10 분석)
 * - 삼성복지원본 1203.xlsx
 * - 삼성카드 원본 1203.xlsx
 * - sk원본1203.xlsx
 *
 * columnMappings: { 엑셀컬럼헤더: order테이블필드키 }
 */
const SHOPPING_MALL_SEED_DATA = [
  // ============================================
  // SK스토아
  // ============================================
  // Row 1-2: 제목/메타정보
  // Row 3: 실제 헤더 (No, 확인, 주문구분, 통관번호, 통합주문번호, 주문번호, ...)
  // Row 4+: 데이터
  {
    mallName: 'sk_stoa',
    displayName: 'SK스토아',
    headerRow: 3,
    dataStartRow: 4,
    columnMappings: {
      통합주문번호: 'sabangnetOrderNumber',
      상품코드: 'productCode',
      단품코드: 'mallProductNumber',
      상품명: 'productName',
      단품상세: 'optionName',
      수량: 'quantity',
      고객명: 'orderName',
      인수자: 'recipientName',
      전화1: 'recipientPhone',
      전화2: 'recipientMobile',
      우편번호: 'postalCode',
      주소: 'address',
      배송메시지: 'memo',
      배송방법: 'courier',
      하위업체명: 'manufacturerName',
      '결제금액(부가세포함)': 'paymentAmount',
    },
    enabled: true,
  },

  // ============================================
  // 삼성카드몰
  // ============================================
  // Row 1: 헤더 (주문일자, 배송지시일, ..., 주문번호, ..., 상품코드, 상품명, ...)
  // Row 2+: 데이터
  // 주의: "전화번호" 컬럼이 주문자/수취인 각각 존재하나 동일 헤더명으로 첫 번째만 매핑됨
  {
    mallName: 'samsung_card',
    displayName: '삼성카드몰',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {
      주문번호: 'sabangnetOrderNumber',
      상품코드: 'productCode',
      상품명: 'productName',
      단품명: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      휴대전화: 'orderMobile',
      전화번호: 'orderPhone',
      수취인: 'recipientName',
      휴대폰번호: 'recipientMobile',
      우편번호: 'postalCode',
      주소: 'address',
      고객배송요청사항: 'memo',
      배송방법: 'courier',
      브랜드: 'shoppingMall',
      업체명: 'manufacturerName',
      공급금액: 'cost',
      결제금액: 'paymentAmount',
    },
    enabled: true,
  },

  // ============================================
  // 삼성복지몰
  // ============================================
  // Row 1: 헤더 (고객사, 사번, 주문일자, ..., 주문번호, ..., 상품코드, 상품명, ...)
  // Row 2+: 데이터
  // 주의: "전화번호" 컬럼이 주문자/수취인 각각 존재하나 동일 헤더명으로 첫 번째만 매핑됨
  {
    mallName: 'samsung_welfare',
    displayName: '삼성복지몰',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {
      주문번호: 'sabangnetOrderNumber',
      상품코드: 'productCode',
      상품명: 'productName',
      단품명: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      휴대전화: 'orderMobile',
      전화번호: 'orderPhone',
      수취인: 'recipientName',
      휴대폰번호: 'recipientMobile',
      우편번호: 'postalCode',
      주소: 'address',
      고객배송요청사항: 'memo',
      배송방법: 'courier',
      브랜드: 'shoppingMall',
      업체명: 'manufacturerName',
      공급금액: 'cost',
      결제금액: 'paymentAmount',
    },
    enabled: true,
  },
]

async function seed() {
  const databaseURL = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  if (!databaseURL) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  console.log('🌱 Seeding shopping mall templates...')

  const client = postgres(databaseURL, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    const inserted = await db
      .insert(shoppingMallTemplate)
      .values(
        SHOPPING_MALL_SEED_DATA.map((template) => ({
          mallName: template.mallName,
          displayName: template.displayName,
          headerRow: template.headerRow,
          dataStartRow: template.dataStartRow,
          columnMappings: JSON.stringify(template.columnMappings),
          enabled: template.enabled,
        })),
      )
      .onConflictDoNothing({ target: shoppingMallTemplate.mallName })
      .returning({ mallName: shoppingMallTemplate.mallName, displayName: shoppingMallTemplate.displayName })

    if (inserted.length === 0) {
      console.log('ℹ️  No new templates to add (all already exist)')
    } else {
      console.log(`✅ Added ${inserted.map((t) => t.mallName).join(', ')}`)
    }

    const skipped = SHOPPING_MALL_SEED_DATA.length - inserted.length
    if (skipped > 0) {
      console.log(`⏭️  Skipped ${skipped} existing template(s)`)
    }

    console.log('🎉 Seeding completed!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()
