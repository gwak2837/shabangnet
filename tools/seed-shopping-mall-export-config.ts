import './server-only'

import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { shoppingMallTemplate } from '../src/db/schema/settings'

interface ExportConfigV1 {
  columns: Array<
    | { header?: string; source: { type: 'const'; value: string } }
    | { header?: string; source: { type: 'input'; columnIndex: number } }
  >
  copyPrefixRows?: boolean
  version: 1
}

const HEADERS = {
  samsung_welfare: [
    '고객사',
    '사번',
    '주문일자',
    '배송지시일',
    '배송예정일자',
    '배송예약일',
    '배송희망일',
    '주문번호',
    '배송번호',
    '주문매체',
    '배송유형',
    '배송상태',
    '배송방법',
    '브랜드',
    '상품코드',
    '상품명',
    '단품명',
    '공급금액',
    '수량',
    '판매금액',
    '할인',
    '결제금액',
    '주문요청메시지',
    '주문자',
    '휴대전화',
    '전화번호',
    '가상연락처',
    '주문자e-mail',
    '수취인',
    '휴대폰번호',
    '전화번호',
    '휴대폰_가상번호',
    '전화번호_가상번호',
    '우편번호',
    '주소',
    '개인통관고유부호',
    '고객배송요청사항',
    '신청회차',
    '진행회차',
    '선물하기',
    '업체명',
    '회원ID',
    '출하지시일',
    '출하완료일',
  ],
  samsung_card: [
    '주문일자',
    '배송지시일',
    '배송예정일자',
    '배송예약일',
    '주문번호',
    '배송번호',
    '주문매체',
    '배송유형',
    '배송상태',
    '배송방법',
    '브랜드',
    '상품코드',
    '상품명',
    '단품명',
    '공급금액',
    '수량',
    '판매금액',
    '할인',
    '결제금액',
    '주문요청메시지',
    '주문자',
    '휴대전화',
    '전화번호',
    '가상연락처',
    '주문자e-mail',
    '수취인',
    '휴대폰번호',
    '전화번호',
    '휴대폰_가상번호',
    '전화번호_가상번호',
    '우편번호',
    '주소',
    '개인통관고유부호',
    '고객배송요청사항',
    '신청회차',
    '진행회차',
    '선물하기',
    '업체명',
    '회원ID',
    '출하지시일',
    '출하완료일',
  ],
  sk_stoa: [
    'No',
    '확인',
    '주문구분',
    '통관번호',
    '통합주문번호',
    '주문번호',
    '승인일시',
    '업체지시일',
    '출하지시일',
    '상품코드',
    '단품코드',
    '상품명',
    '단품상세',
    '교환수량',
    '교환단품',
    '단품상세',
    '수량',
    '배송수량',
    '지정일출고여부',
    '출고지정일자',
    '예약주문여부',
    '출고예약일자',
    '고객명',
    '인수자',
    '우편번호',
    '주소',
    '전화1',
    '전화2',
    '상담전화번호',
    '출고일',
    '배송완료일자',
    '품절',
    '하위업체코드',
    '하위업체명',
    '판매가(부가세포함)',
    '판매가(부가세미포함)',
    '결제금액(부가세포함)',
    '결제금액(부가세미포함)',
    '결제금액(부가세)',
    '배송메시지',
  ],
} as const

function inputColumns(count: number): number[] {
  return Array.from({ length: count }, (_, i) => i + 1)
}

function range(start: number, endInclusive: number): number[] {
  const out: number[] = []
  for (let i = start; i <= endInclusive; i++) out.push(i)
  return out
}

const EXPORT_CONFIGS: Record<string, ExportConfigV1> = {
  // 삼성복지몰: 44열 중 7(배송희망일), 22(결제금액) 제거
  samsung_welfare: {
    version: 1,
    copyPrefixRows: true,
    columns: inputColumns(44)
      .filter((i) => i !== 7 && i !== 22)
      .map((columnIndex) => ({
        header: HEADERS.samsung_welfare[columnIndex - 1] ?? '',
        source: { type: 'input' as const, columnIndex },
      })),
  },

  // 삼성카드몰: 41열 중 20(주문요청메시지) 제거
  samsung_card: {
    version: 1,
    copyPrefixRows: true,
    columns: inputColumns(41)
      .filter((i) => i !== 20)
      .map((columnIndex) => ({
        header: HEADERS.samsung_card[columnIndex - 1] ?? '',
        source: { type: 'input' as const, columnIndex },
      })),
  },

  // SK스토아: 40열 중 14~16 제거 + 37~38 제거 + 39 다음에 빈 컬럼 추가
  sk_stoa: {
    version: 1,
    copyPrefixRows: true,
    columns: [
      ...range(1, 13).map((columnIndex) => ({
        header: HEADERS.sk_stoa[columnIndex - 1] ?? '',
        source: { type: 'input' as const, columnIndex },
      })),
      ...range(17, 36).map((columnIndex) => ({
        header: HEADERS.sk_stoa[columnIndex - 1] ?? '',
        source: { type: 'input' as const, columnIndex },
      })),
      { header: HEADERS.sk_stoa[39 - 1] ?? '', source: { type: 'input' as const, columnIndex: 39 } },
      { header: '', source: { type: 'const' as const, value: '' } },
      { header: HEADERS.sk_stoa[40 - 1] ?? '', source: { type: 'input' as const, columnIndex: 40 } },
    ],
  },
}

async function seed() {
  const databaseURL = process.env.SUPABASE_POSTGRES_URL_NON_POOLING
  if (!databaseURL) {
    console.error('❌ SUPABASE_POSTGRES_URL_NON_POOLING environment variable is not set')
    process.exit(1)
  }

  console.log('🌱 Seeding shopping mall export configs...')

  const client = postgres(databaseURL, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    for (const [mallName, config] of Object.entries(EXPORT_CONFIGS)) {
      const [existing] = await db
        .select({
          mallName: shoppingMallTemplate.mallName,
          exportConfig: shoppingMallTemplate.exportConfig,
        })
        .from(shoppingMallTemplate)
        .where(eq(shoppingMallTemplate.mallName, mallName))

      if (!existing) {
        console.log(`⏭️  Skip: template not found (${mallName})`)
        continue
      }

      await db
        .update(shoppingMallTemplate)
        .set({ exportConfig: JSON.stringify(config) })
        .where(eq(shoppingMallTemplate.mallName, mallName))

      console.log(`${existing.exportConfig ? '🔁 Updated' : '✅ Configured'} export template: ${mallName}`)
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
