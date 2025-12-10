import './server-only'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { shoppingMallTemplate } from '../src/db/schema/settings'

// 실제 파일 분석 결과 기반 쇼핑몰 템플릿 설정
// 컬럼 매핑: { 쇼핑몰컬럼명: 사방넷키 }
const SHOPPING_MALL_SEED_DATA = [
  {
    mallName: 'sk_stoa',
    displayName: 'SK스토아',
    headerRow: 3, // 1-2행은 제목, 3행이 실제 헤더
    dataStartRow: 4,
    columnMappings: {
      통합주문번호: 'orderNumber',
      상품코드: 'productCode',
      상품명: 'productName',
      단품상세: 'optionName',
      수량: 'quantity',
      고객명: 'orderName',
      인수자: 'recipientName',
      우편번호: 'postalCode',
      주소: 'address',
      전화1: 'recipientPhone',
      전화2: 'recipientMobile',
      배송메시지: 'memo',
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
      주문번호: 'orderNumber',
      상품코드: 'productCode',
      상품명: 'productName',
      단품명: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      수취인: 'recipientName',
      우편번호: 'postalCode',
      주소: 'address',
      휴대폰번호: 'recipientMobile',
      전화번호: 'recipientPhone',
      고객배송요청사항: 'memo',
      결제금액: 'paymentAmount',
      공급금액: 'cost',
    },
    enabled: true,
  },
  {
    mallName: 'samsung_welfare',
    displayName: '삼성복지몰',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {
      주문번호: 'orderNumber',
      상품코드: 'productCode',
      상품명: 'productName',
      단품명: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      수취인: 'recipientName',
      우편번호: 'postalCode',
      주소: 'address',
      휴대폰번호: 'recipientMobile',
      전화번호: 'recipientPhone',
      고객배송요청사항: 'memo',
      결제금액: 'paymentAmount',
      공급금액: 'cost',
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
    for (const template of SHOPPING_MALL_SEED_DATA) {
      // 이미 존재하는지 확인
      const existing = await db
        .select()
        .from(shoppingMallTemplate)
        .where(eq(shoppingMallTemplate.mallName, template.mallName))
        .limit(1)

      if (existing.length > 0) {
        console.log(`⏭️  Skipping ${template.displayName} (already exists)`)
        continue
      }

      // 새로 추가
      await db.insert(shoppingMallTemplate).values({
        mallName: template.mallName,
        displayName: template.displayName,
        headerRow: template.headerRow,
        dataStartRow: template.dataStartRow,
        columnMappings: JSON.stringify(template.columnMappings),
        enabled: template.enabled,
      })

      console.log(`✅ Added ${template.displayName}`)
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
