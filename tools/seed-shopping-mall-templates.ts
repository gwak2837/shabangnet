import './server-only'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { shoppingMallTemplate } from '../src/db/schema/settings'

/**
 * 쇼핑몰 템플릿 시드 데이터
 * columnMappings: { 엑셀컬럼헤더: order테이블필드키 }
 */
const SHOPPING_MALL_SEED_DATA = [
  {
    mallName: 'sk_stoa',
    displayName: 'SK스토아',
    headerRow: 3,
    dataStartRow: 4,
    columnMappings: {
      통합주문번호: 'sabangnetOrderNumber',
      주문번호: 'mallOrderNumber',
      상품코드: 'mallProductNumber',
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
      하위업체명: 'manufacturerName',
      '결제금액(부가세포함)': 'paymentAmount',
    },
    enabled: true,
  },
  {
    mallName: 'samsung_card',
    displayName: '삼성카드몰',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {
      주문번호: 'sabangnetOrderNumber',
      배송번호: 'mallOrderNumber',
      상품코드: 'mallProductNumber',
      상품명: 'productName',
      단품명: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      휴대전화: 'orderMobile',
      수취인: 'recipientName',
      휴대폰번호: 'recipientMobile',
      우편번호: 'postalCode',
      주소: 'address',
      주문요청메시지: 'logisticsNote',
      고객배송요청사항: 'memo',
      배송유형: 'fulfillmentType',
      브랜드: 'manufacturerName',
      공급금액: 'cost',
      결제금액: 'paymentAmount',
    },
    enabled: true,
  },
  {
    mallName: 'samsung_welfare',
    displayName: '삼성복지몰',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {
      주문번호: 'sabangnetOrderNumber',
      배송번호: 'mallOrderNumber',
      상품코드: 'mallProductNumber',
      상품명: 'productName',
      단품명: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      휴대전화: 'orderMobile',
      수취인: 'recipientName',
      휴대폰번호: 'recipientMobile',
      우편번호: 'postalCode',
      주소: 'address',
      주문요청메시지: 'logisticsNote',
      고객배송요청사항: 'memo',
      배송유형: 'fulfillmentType',
      브랜드: 'manufacturerName',
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
      .onConflictDoUpdate({
        target: shoppingMallTemplate.mallName,
        set: {
          displayName: sql`excluded.display_name`,
          headerRow: sql`excluded.header_row`,
          dataStartRow: sql`excluded.data_start_row`,
          columnMappings: sql`excluded.column_mappings`,
          enabled: sql`excluded.enabled`,
          updatedAt: new Date(),
        },
      })
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
