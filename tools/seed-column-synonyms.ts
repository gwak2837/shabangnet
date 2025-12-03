/**
 * 컬럼 동의어 시드 스크립트
 *
 * 사방넷 표준 컬럼에 대한 동의어 매핑을 DB에 등록합니다.
 *
 * 실행 방법:
 * npx tsx tools/seed-column-synonyms.ts
 */

import './env-loader'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { columnSynonym } from '../src/db/schema/settings'

// ============================================
// 컬럼 동의어 사전 (자동 매핑용)
// key: 사방넷 컬럼 key, values: 유사한 이름들
// ============================================
const COLUMN_SYNONYMS: Record<string, string[]> = {
  productName: ['상품명', '상품', '품명', '품목명', '주문내역', '주문내역-1'],
  quantity: ['수량', '주문수량', '택배수량', 'qty', '갯수', '개수'],
  orderName: ['주문인', '주문자', '주문자명', '보내는분', '보내시는분', '보내는사람'],
  recipientName: ['받는인', '받는사람', '수취인', '수취인명', '인수자', '받으시는분', '받는분', '고객명'],
  orderPhone: ['주문인연락처', '주문인전화', '보내는전화', '보내시는분전화', '주문자전화'],
  orderMobile: ['주문인핸드폰', '주문인휴대폰', '보내는분핸드폰', '주문자휴대폰'],
  recipientPhone: ['받는인연락처', '받는인전화', '받는집전화', '받으시는분전화', '수취인전화', '전화1'],
  recipientMobile: [
    '핸드폰',
    '받는인핸드폰',
    '받는휴대폰',
    '받는분핸드폰',
    '수취인휴대폰',
    '수취인연락처',
    '휴대폰번호',
    '휴대전화',
    '전화2',
    '연락처',
  ],
  postalCode: ['우편', '우편번호', '우편번호호', '받는분우편번호', '수취인우편번호', 'zipcode'],
  address: ['배송지', '주소', '받는주소', '수취인주소', '배송주소', '받는분총주소', '받으시는분주소', '상세주소'],
  memo: ['전언', '배송메시지', '배송메모', '주문메모', '고객배송요청사항', '배송요청메모', '특기사항', '메모', '비고'],
  shoppingMall: ['쇼핑몰', '사이트', '판매처', '몰'],
  manufacturer: ['제조사', '업체명', '공급사', '거래처'],
  courier: ['택배', '택배사', '배송업체', '운송업체'],
  trackingNumber: ['송장번호', '운송장번호', '운송장', '송장'],
  orderNumber: ['주문번호', '주문번호(쇼핑몰)', '쇼핑몰주문번호', '사방넷주문번호', '통합주문번호', '배송번호'],
  optionName: ['옵션', '옵션명', '단품상세', '단품명'],
  paymentAmount: ['결제금액', '판매가', '금액', '결제금액(부가세포함)'],
  productCode: ['품번코드', '상품코드', '자체상품코드', '단품코드'],
  cost: ['원가(상품)', '원가', '공급금액', '매입가'],
  shippingCost: ['택배비', '배송비', '배송료', '운송비'],
}

async function seed() {
  const databaseUrl = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  if (!databaseUrl) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  console.log('🌱 Seeding column synonyms...')

  const client = postgres(databaseUrl, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    let created = 0
    let skipped = 0

    for (const [standardKey, synonyms] of Object.entries(COLUMN_SYNONYMS)) {
      for (const synonym of synonyms) {
        try {
          await db
            .insert(columnSynonym)
            .values({
              id: `syn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              standardKey,
              synonym,
              enabled: true,
            })
            .onConflictDoNothing()

          created++
          console.log(`  ✅ ${standardKey}: ${synonym}`)
        } catch {
          skipped++
          console.log(`  ⏭️  ${standardKey}: ${synonym} (already exists or error)`)
        }

        // 유니크 ID를 위한 약간의 딜레이
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
    }

    // 결과 요약
    console.log('\n📊 Summary:')
    console.log(`   Created: ${created}`)
    console.log(`   Skipped: ${skipped}`)

    console.log('\n🎉 Seeding completed!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()
