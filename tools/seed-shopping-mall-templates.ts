import './server-only'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

import { shoppingMallTemplate } from '../src/db/schema/settings'
import { stringifyShoppingMallTemplateColumnConfig } from '../src/services/shopping-mall-template-config'

interface ExportConfig {
  columns: (
    | { header?: string; source: { type: 'const'; value: string } }
    | { header?: string; source: { type: 'input'; columnIndex: number } }
  )[]
  copyPrefixRows?: boolean
}

/**
 * 쇼핑몰 템플릿 시드 데이터
 * columnMappings: { 엑셀컬럼헤더: order테이블필드키 }
 */
interface ShoppingMallSeedTemplate {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  enabled: boolean
  fixedValues?: Record<string, string>
  headerRow: number
  mallName: string
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
  welplaza: [
    '고유번호',
    '주문번호',
    '상품코드',
    '주문자',
    '수령인',
    '주문인연락처',
    '수령인연락처1',
    '수령인연락처2',
    '자사상품코드',
    '상품명',
    '옵션',
    '수량',
    '판매가격',
    '공급가격',
    '옵션가격',
    '옵션공급가격',
    '배송비',
    '총공급가격',
    '총판매가격',
    '주문일',
    '우편번호',
    '주소',
    '주문시요구사항',
    '택배사',
    '송장번호',
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

const EXPORT_CONFIGS: Record<string, ExportConfig> = {
  // 삼성복지몰: 44열 중 7(배송희망일), 22(결제금액) 제거
  samsung_welfare: {
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

  // 웰프라자: 25열 중 16(옵션공급가격) ↔ 17(배송비) 순서 스왑
  welplaza: {
    copyPrefixRows: true,
    columns: [
      ...range(1, 15).map((columnIndex) => ({
        header: HEADERS.welplaza[columnIndex - 1] ?? '',
        source: { type: 'input' as const, columnIndex },
      })),
      { header: HEADERS.welplaza[17 - 1] ?? '', source: { type: 'input' as const, columnIndex: 17 } },
      { header: HEADERS.welplaza[16 - 1] ?? '', source: { type: 'input' as const, columnIndex: 16 } },
      ...range(18, 25).map((columnIndex) => ({
        header: HEADERS.welplaza[columnIndex - 1] ?? '',
        source: { type: 'input' as const, columnIndex },
      })),
    ],
  },
}

const SHOPPING_MALL_SEED_DATA: ShoppingMallSeedTemplate[] = [
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
    fixedValues: { shoppingMall: 'SK스토아' },
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
    fixedValues: { shoppingMall: '삼성카드몰' },
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
    fixedValues: { shoppingMall: '삼성복지몰' },
    enabled: true,
  },
  {
    mallName: 'welplaza',
    displayName: '웰프라자',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {
      주문번호: 'sabangnetOrderNumber',
      상품코드: 'mallProductNumber',
      상품명: 'productName',
      옵션: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      수령인: 'recipientName',
      주문인연락처: 'orderMobile',
      수령인연락처1: 'recipientPhone',
      수령인연락처2: 'recipientMobile',
      우편번호: 'postalCode',
      주소: 'address',
      주문시요구사항: 'memo',
      택배사: 'courier',
      송장번호: 'trackingNumber',
      총판매가격: 'paymentAmount',
      총공급가격: 'cost',
      배송비: 'shippingCost',
    },
    fixedValues: { shoppingMall: '웰프라자' },
    enabled: true,
  },
]

async function seed() {
  const databaseURL = process.env.SUPABASE_POSTGRES_URL_NON_POOLING

  if (!databaseURL) {
    console.error('❌ Database URL is not set (SUPABASE_POSTGRES_URL_NON_POOLING)')
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
          exportConfig: (() => {
            const config = EXPORT_CONFIGS[template.mallName]
            if (!config) {
              throw new Error(`Export config is missing for mallName: ${template.mallName}`)
            }
            return JSON.stringify(config)
          })(),
          mallName: template.mallName,
          displayName: template.displayName,
          headerRow: template.headerRow,
          dataStartRow: template.dataStartRow,
          columnMappings: stringifyShoppingMallTemplateColumnConfig({
            columnMappings: template.columnMappings,
            fixedValues: template.fixedValues ?? {},
          }),
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
          exportConfig: sql`excluded.export_config`,
          enabled: sql`excluded.enabled`,
          updatedAt: new Date(),
        },
      })
      .returning({
        mallName: shoppingMallTemplate.mallName,
        displayName: shoppingMallTemplate.displayName,
      })

    console.log(`✅ Upserted ${inserted.length} template(s): ${inserted.map((t) => t.mallName).join(', ')}`)
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()
