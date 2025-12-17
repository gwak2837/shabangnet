import './server-only'

import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import ExcelJS from 'exceljs'
import postgres from 'postgres'

import { commonOrderTemplate } from '../src/db/schema/settings'

const COMMON_ORDER_TEMPLATE_KEY = 'default'

const TEMPLATE_FILE_NAME = '다온발주양식.xlsx'
const TEMPLATE_HEADERS = [
  '상품명',
  '수량',
  '주문인',
  '받는인',
  '주문인연락처',
  '주문인핸드폰',
  '받는인연락처',
  '핸드폰',
  '우편',
  '배송지',
  '전언',
  '쇼핑몰',
  '제조사',
  '택배',
  '송장번호',
  '주문번호',
] as const

// "사방넷 key(ParsedOrder 필드)" -> "엑셀 컬럼 문자(A, B, ...)"
// (템플릿의 헤더를 기준으로 상수로 고정합니다)
const COLUMN_MAPPINGS = {
  productName: 'A',
  quantity: 'B',
  orderName: 'C',
  recipientName: 'D',
  orderPhone: 'E',
  orderMobile: 'F',
  recipientPhone: 'G',
  recipientMobile: 'H',
  postalCode: 'I',
  address: 'J',
  memo: 'K',
  shoppingMall: 'L',
  manufacturer: 'M',
  courier: 'N',
  trackingNumber: 'O',
  mallOrderNumber: 'P',
} satisfies Record<string, string>

// 필요 시 컬럼/필드 고정값을 추가하세요.
// - 컬럼 단위: { "A": "다온에프앤씨" }
// - 필드 단위 덮어쓰기: { "FIELD:orderName": "{{orderName || recipientName}}" }
const FIXED_VALUES = {} satisfies Record<string, string>

async function buildTemplateFile(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '(주)다온에프앤씨'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('다온발주서')

  // 1행: 헤더
  const headerRow = worksheet.addRow([...TEMPLATE_HEADERS])
  headerRow.font = { bold: true }

  // 2행: 데이터 시작 행(서식 복제 대상). 빈 행이라도 존재해야 duplicateRow가 안전해요.
  worksheet.addRow(Array.from({ length: TEMPLATE_HEADERS.length }, () => ''))

  // 컬럼 너비는 기능상 필수는 아니지만, 다운로드 시 가독성에 도움이 돼요.
  worksheet.columns = TEMPLATE_HEADERS.map((header) => {
    const base = Math.max(10, Math.min(40, String(header).length * 2))
    return { width: base }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

async function seed() {
  const databaseURL =
    process.env.SUPABASE_POSTGRES_URL_NON_POOLING ?? process.env.SUPABASE_POSTGRES_URL ?? process.env.DATABASE_URL
  if (!databaseURL) {
    console.error(
      '❌ Database URL is not set (SUPABASE_POSTGRES_URL_NON_POOLING / SUPABASE_POSTGRES_URL / DATABASE_URL)',
    )
    process.exit(1)
  }

  const templateFile = await buildTemplateFile()
  const templateFileName = TEMPLATE_FILE_NAME

  // 현재 공통 템플릿 기능은 1행 헤더 + 2행부터 데이터로 고정해서 운영 중이라,
  // 시드도 동일한 값으로 저장해요.
  const headerRow = 1
  const dataStartRow = 2

  console.log('🌱 Seeding common order template...')
  console.log(`   key: ${COMMON_ORDER_TEMPLATE_KEY}`)
  console.log(`   template: ${templateFileName} (hard-coded)`)

  const client = postgres(databaseURL, {
    prepare: false,
    max: 1,
    ssl: process.env.SUPABASE_CERTIFICATE
      ? { ca: process.env.SUPABASE_CERTIFICATE, rejectUnauthorized: true }
      : 'prefer',
  })

  const db = drizzle(client)

  try {
    const fixedValuesJson = Object.keys(FIXED_VALUES).length > 0 ? JSON.stringify(FIXED_VALUES) : null

    await db
      .insert(commonOrderTemplate)
      .values({
        key: COMMON_ORDER_TEMPLATE_KEY,
        templateFileName,
        templateFile,
        headerRow,
        dataStartRow,
        columnMappings: JSON.stringify(COLUMN_MAPPINGS),
        fixedValues: fixedValuesJson,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: commonOrderTemplate.key,
        set: {
          templateFileName: sql`excluded.template_file_name`,
          templateFile: sql`excluded.template_file`,
          headerRow: sql`excluded.header_row`,
          dataStartRow: sql`excluded.data_start_row`,
          columnMappings: sql`excluded.column_mappings`,
          fixedValues: sql`excluded.fixed_values`,
          updatedAt: new Date(),
        },
      })

    console.log('✅ Upserted common order template')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  } finally {
    await client.end()
  }
}

seed()
