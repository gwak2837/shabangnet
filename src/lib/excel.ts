import ExcelJS from 'exceljs'

import type { InvoiceTemplate } from '../services/manufacturers.types'

import { getCellValue } from './excel/util'

// ============================================
// 타입 정의
// ============================================

// 송장 변환 결과 (개별 건)
export interface InvoiceConvertResultItem {
  courierCode: string // 변환된 택배사 코드
  errorMessage?: string // 에러 메시지
  originalCourier?: string // 원본 택배사명 (에러 시)
  sabangnetOrderNumber: string // 사방넷 주문번호
  status: 'courier_error' | 'order_not_found' | 'success'
  trackingNumber: string // 송장번호
}

// 송장 파싱 결과 (개별 건)
export interface InvoiceRow {
  courierName: string // 원본 택배사명
  rowIndex: number // 원본 행 번호
  sabangnetOrderNumber: string // 사방넷 주문번호
  trackingNumber: string // 송장번호
}

// 발주서에 포함될 주문 데이터 타입
export interface OrderData {
  address: string
  customerName: string // 수취인명
  memo?: string
  optionName: string
  orderName?: string // 주문자명
  phone: string
  price: number
  productCode: string
  productName: string
  quantity: number
  sabangnetOrderNumber: string // 사방넷 주문번호
}

// 제조사별 발주서 생성 옵션
export interface OrderSheetOptions {
  date?: Date
  manufacturerName: string
  orders: OrderData[]
}

// 제조사 발주서 템플릿 설정
export interface OrderTemplateConfig {
  columnMappings: Record<string, string> // 사방넷 key -> 템플릿 컬럼 (A, B, C...)
  dataStartRow: number
  fixedValues?: Record<string, string> // 고정값 (컬럼(A) 또는 field:orderName -> 값)
  headerRow: number
}

// 사방넷 원본 파일에서 파싱된 주문 데이터
export interface ParsedOrder {
  address: string // J열: 배송지
  cjDate: string // W열: 씨제이날짜
  collectedAt: string // Y열: 수집일시

  cost: number // ^열: 원가(상품)*수량
  courier: string // N열: 택배사
  // 주문 메타
  fulfillmentType: string // T열: F (주문유형)
  logisticsNote: string // X열: 물류전달사항
  mallOrderNumber: string // P열: 쇼핑몰주문번호
  mallProductNumber: string // R열: 쇼핑몰상품번호
  manufacturer: string // M열: 제조사

  memo: string // K열: 전언
  modelNumber: string // ]열: 모델번호
  optionName: string // S열: 옵션
  orderMobile: string // F열: 주문인 핸드폰
  // 주문자/수취인
  orderName: string // C열: 주문인
  orderPhone: string // E열: 주문인 연락처

  // 금액
  paymentAmount: number // U열: 결제금액
  // 배송 정보
  postalCode: string // I열: 우편번호
  productAbbr: string // V열: 상품약어
  productCode: string // 상품코드 (사이트::쇼핑몰상품번호)
  // 상품 정보
  productName: string // A열: 상품명
  quantity: number // B열: 수량

  recipientMobile: string // H열: 받는인 핸드폰
  recipientName: string // D열: 받는인

  recipientPhone: string // G열: 받는인 연락처
  // 시스템
  rowIndex: number // 원본 행 번호 (에러 추적용)
  // 주문 식별자
  sabangnetOrderNumber: string // Q열: 사방넷주문번호 (UNIQUE KEY)

  shippingCost: number // 택배비
  // 소스/제조사
  shoppingMall: string // L열: 사이트
  subOrderNumber: string // Z열: 부주문번호

  trackingNumber: string // O열: 송장번호
}

// 파싱 에러
export interface ParseError {
  column?: string
  data?: Record<string, unknown>
  message: string
  row: number
}

// 파싱 결과
export interface ParseResult {
  errors: ParseError[]
  orders: ParsedOrder[]
  totalRows: number
}

// 템플릿 분석 결과
export interface TemplateAnalysis {
  dataStartRow: number
  headerRow: number
  /** A열부터 순서대로 헤더 텍스트를 담아요. 빈 셀은 ''로 유지돼요. */
  headers: string[]
  /** 헤더/예시 기준으로 "의미 있게 쓰이는" 마지막 컬럼 인덱스(1-based, A=1) */
  lastUsedColumnIndex: number
  sampleData: Record<string, string>[] // 예시 데이터 (최대 3행)
  suggestedMappings: Record<string, string> // 사방넷 key -> 템플릿 컬럼 (A, B, C...)
}

interface TemplateVariables {
  date: string
  manufacturerName: string
  totalAmount: number
  totalItems: number
  totalQuantity: number
}

// 발주서 기본 헤더
const DEFAULT_HEADERS = [
  { key: 'sabangnetOrderNumber', header: '사방넷주문번호', width: 20 },
  { key: 'customerName', header: '수취인명', width: 15 },
  { key: 'phone', header: '연락처', width: 18 },
  { key: 'address', header: '배송지', width: 50 },
  { key: 'productName', header: '상품명', width: 40 },
  { key: 'optionName', header: '옵션', width: 20 },
  { key: 'quantity', header: '수량', width: 10 },
  { key: 'price', header: '금액', width: 15 },
  { key: 'memo', header: '비고', width: 20 },
]

/**
 * 템플릿 파일 구조 분석
 */
export async function analyzeTemplateStructure(buffer: ArrayBuffer): Promise<TemplateAnalysis> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    throw new Error('워크시트를 찾을 수 없습니다')
  }

  const worksheetColumnCount = Math.max(1, worksheet.columnCount || 1)

  // 헤더 행 찾기 (데이터가 있는 첫 번째 행)
  let headerRow = 1
  let headers: string[] = []
  let dataStartRow = 2

  const suggestedMappings: Record<string, string> = {}

  const headerToFieldKey: Record<string, string> = {
    // 주문 식별자
    사방넷주문번호: 'sabangnetOrderNumber',
    쇼핑몰주문번호: 'mallOrderNumber',
    주문번호: 'mallOrderNumber',
    부주문번호: 'subOrderNumber',

    // 상품/주문
    상품명: 'productName',
    옵션: 'optionName',
    옵션명: 'optionName',
    수량: 'quantity',
    결제금액: 'paymentAmount',
    상품코드: 'productCode',
    쇼핑몰상품번호: 'mallProductNumber',
    사이트: 'shoppingMall',
    제조사: 'manufacturer',

    // 수취/배송
    주문인: 'orderName',
    주문자: 'orderName',
    받는인: 'recipientName',
    수취인: 'recipientName',
    주문인연락처: 'orderPhone',
    주문인핸드폰: 'orderMobile',
    받는인연락처: 'recipientPhone',
    받는인핸드폰: 'recipientMobile',
    우편번호: 'postalCode',
    배송지: 'address',
    주소: 'address',

    // 기타
    전언: 'memo',
    비고: 'memo',
  }

  // "첫 번째 내용 있는 행" 대신, 헤더처럼 보이는 행(키워드 일치가 많은 행)을 우선으로 잡아요.
  const maxScanRows = Math.min(worksheet.rowCount || 1, 50)
  let firstContentRowNumber: number | null = null
  let firstContentRowValues: string[] = []

  let bestRowNumber: number | null = null
  let bestRowValues: string[] = []
  let bestScore = -1
  let bestMatchCount = 0

  for (let rowNumber = 1; rowNumber <= maxScanRows; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const rowValues: string[] = Array.from({ length: worksheetColumnCount }, () => '')
    let nonEmptyCount = 0
    let matchCount = 0

    for (let colNumber = 1; colNumber <= worksheetColumnCount; colNumber++) {
      const value = getCellValue(row.getCell(colNumber))
      rowValues[colNumber - 1] = value

      if (value && value.trim()) {
        nonEmptyCount += 1
        const normalized = normalizeHeaderForMapping(value)
        if (normalized && headerToFieldKey[normalized]) {
          matchCount += 1
        }
      }
    }

    if (nonEmptyCount === 0) {
      continue
    }

    if (firstContentRowNumber === null) {
      firstContentRowNumber = rowNumber
      firstContentRowValues = rowValues
    }

    const score = matchCount * 100 + nonEmptyCount
    if (score > bestScore) {
      bestScore = score
      bestRowNumber = rowNumber
      bestRowValues = rowValues
      bestMatchCount = matchCount
    }
  }

  if (bestRowNumber === null) {
    // 그래도 아무것도 못 찾으면 1행으로 기본값
    headerRow = 1
    headers = Array.from({ length: worksheetColumnCount }, () => '')
    dataStartRow = 2
  } else {
    const useFirstContentFallback = bestMatchCount === 0 && firstContentRowNumber !== null
    headerRow = useFirstContentFallback ? firstContentRowNumber! : bestRowNumber
    headers = useFirstContentFallback ? firstContentRowValues : bestRowValues
    dataStartRow = headerRow + 1
  }

  for (let i = 0; i < headers.length; i++) {
    const normalizedHeader = normalizeHeaderForMapping(headers[i] ?? '')
    if (!normalizedHeader) continue
    const fieldKey = headerToFieldKey[normalizedHeader]
    if (!fieldKey) continue
    if (suggestedMappings[fieldKey]) continue
    suggestedMappings[fieldKey] = indexToColumnLetter(i)
  }

  // 예시 데이터 추출 (최대 3행)
  const sampleData: Record<string, string>[] = []
  let sampleCount = 0

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRow || sampleCount >= 3) return

    const rowData: Record<string, string> = {}
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const col = indexToColumnLetter(colNumber - 1)
      rowData[col] = getCellValue(cell)
    })

    // 빈 행이 아니면 추가
    if (Object.values(rowData).some((v) => v && v.trim())) {
      sampleData.push(rowData)
      sampleCount++
    }
  })

  let lastUsedColumnIndex = 0
  for (let i = headers.length - 1; i >= 0; i--) {
    if ((headers[i] ?? '').trim().length > 0) {
      lastUsedColumnIndex = i + 1
      break
    }
  }
  if (lastUsedColumnIndex === 0) {
    lastUsedColumnIndex = worksheetColumnCount
  }

  return {
    headers,
    headerRow,
    dataStartRow,
    suggestedMappings,
    sampleData,
    lastUsedColumnIndex,
  }
}

/**
 * 엑셀 컬럼 문자를 인덱스로 변환 (A -> 0, Z -> 25, AA -> 26)
 */
export function columnLetterToIndex(letter: string): number {
  let index = 0
  for (let i = 0; i < letter.length; i++) {
    index = index * 26 + (letter.charCodeAt(i) - 64)
  }
  return index - 1
}

/**
 * 날짜 포맷 (YYYYMMDD)
 */
export function formatDateForFileName(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * 수취인명 표기 형식화
 * 주문자와 수취인이 다르면 "수취인 (주문자 XXX)" 형식으로 표시
 */
export function formatRecipientName(recipientName: string, orderName?: string): string {
  if (!recipientName) {
    return orderName || ''
  }

  // 주문자가 없거나, 수취인과 주문자가 동일하면 수취인명만 표시
  if (!orderName || orderName.trim() === recipientName.trim()) {
    return recipientName
  }

  // 다르면 "수취인 (주문자 XXX)" 형식으로 표시
  return `${recipientName} (주문자 ${orderName})`
}

/**
 * 송장 업로드 파일명 생성
 */
export function generateInvoiceFileName(manufacturerName: string, date: Date = new Date()): string {
  return `사방넷_송장업로드_${manufacturerName}_${formatDateForFileName(date)}.xlsx`
}

/**
 * 발주서 파일명 생성
 */
export function generateOrderFileName(manufacturerName: string, date: Date = new Date()): string {
  return `[다온에프앤씨 발주서]_${manufacturerName}_${formatDateForFileName(date)}.xlsx`
}

/**
 * 제조사별 발주서 엑셀 파일 생성
 * @param options 발주서 생성 옵션
 * @returns Excel 파일 Buffer
 */
export async function generateOrderSheet(options: OrderSheetOptions): Promise<Buffer> {
  const { manufacturerName, orders, date = new Date() } = options

  const workbook = new ExcelJS.Workbook()
  workbook.creator = '(주)다온에프앤씨'
  workbook.created = date

  const worksheet = workbook.addWorksheet('발주서')

  // 헤더 스타일 설정
  const headerStyle: Partial<ExcelJS.Style> = {
    font: { bold: true, size: 11 },
    alignment: { horizontal: 'center', vertical: 'middle' },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  }

  // 데이터 셀 스타일
  const dataStyle: Partial<ExcelJS.Style> = {
    font: { size: 10 },
    alignment: { vertical: 'middle' },
    border: {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    },
  }

  // 타이틀 행 추가
  const titleRow = worksheet.addRow([`[다온에프앤씨 발주서] ${manufacturerName} - ${formatDateForExcel(date)}`])
  titleRow.font = { bold: true, size: 14 }
  titleRow.height = 30
  worksheet.mergeCells('A1:I1')
  titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' }

  // 빈 행 추가
  worksheet.addRow([])

  // 컬럼 설정
  worksheet.columns = DEFAULT_HEADERS.map((h) => ({
    key: h.key,
    header: h.header,
    width: h.width,
  }))

  // 헤더 행 추가 (3번째 행)
  const headerRow = worksheet.addRow(DEFAULT_HEADERS.map((h) => h.header))
  headerRow.eachCell((cell) => {
    Object.assign(cell, { style: headerStyle })
  })
  headerRow.height = 25

  // 데이터 행 추가
  orders.forEach((order) => {
    // 수취인명 표기: 주문자와 다르면 "수취인 (주문자 XXX)" 형식
    const displayCustomerName = formatRecipientName(order.customerName, order.orderName)

    const row = worksheet.addRow([
      order.sabangnetOrderNumber,
      displayCustomerName,
      order.phone,
      order.address,
      formatProductNameWithOption(order.productName, order.optionName),
      order.optionName || '',
      order.quantity,
      order.price,
      order.memo || '',
    ])

    row.eachCell((cell, colNumber) => {
      Object.assign(cell, { style: dataStyle })

      // 수량, 금액은 오른쪽 정렬
      if (colNumber === 7 || colNumber === 8) {
        cell.alignment = { ...cell.alignment, horizontal: 'right' }
      }

      // 금액 포맷
      if (colNumber === 8) {
        cell.numFmt = '#,##0"원"'
      }
    })
  })

  // 합계 행 추가
  const totalQuantity = orders.reduce((sum, o) => sum + o.quantity, 0)
  const totalAmount = orders.reduce((sum, o) => sum + o.price * o.quantity, 0)

  worksheet.addRow([])
  const totalRow = worksheet.addRow(['', '', '', '', '', '합계', totalQuantity, totalAmount, ''])
  totalRow.font = { bold: true }
  totalRow.getCell(8).numFmt = '#,##0"원"'
  totalRow.eachCell((cell, colNumber) => {
    if (colNumber >= 6) {
      cell.border = {
        top: { style: 'double' },
        bottom: { style: 'double' },
      }
    }
  })

  // Buffer로 변환
  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * 사방넷 송장 업로드 양식 엑셀 생성
 * @param results 변환된 송장 데이터 (성공 건만)
 * @returns 엑셀 파일 버퍼
 */
export async function generateSabangnetInvoiceFile(results: InvoiceConvertResultItem[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '(주)다온에프앤씨'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('송장업로드')

  // 헤더 설정
  worksheet.addRow(['사방넷주문번호', '택배사코드', '송장번호'])

  // 헤더 스타일
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true }
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    }
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    }
  })

  // 성공한 데이터만 추가
  const successResults = results.filter((r) => r.status === 'success')
  for (const result of successResults) {
    worksheet.addRow([result.sabangnetOrderNumber, result.courierCode, result.trackingNumber])
  }

  // 컬럼 너비 설정
  worksheet.getColumn(1).width = 25 // 사방넷주문번호
  worksheet.getColumn(2).width = 12 // 택배사코드
  worksheet.getColumn(3).width = 20 // 송장번호

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * 제조사별 템플릿을 사용하여 발주서 생성
 */
export async function generateTemplateBasedOrderSheet(
  orders: ParsedOrder[],
  templateBuffer: ArrayBuffer | null,
  config: OrderTemplateConfig,
  manufacturerName: string,
  date: Date = new Date(),
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()

  // 템플릿이 있으면 로드, 없으면 새로 생성
  if (templateBuffer) {
    await workbook.xlsx.load(templateBuffer)
  } else {
    workbook.creator = '(주)다온에프앤씨'
    workbook.created = date
  }

  let worksheet = workbook.worksheets[0]
  if (!worksheet) {
    worksheet = workbook.addWorksheet('다온발주서')
  }

  const variables = buildTemplateVariables(orders, manufacturerName, date)

  const fixedByColumnLetter = new Map<string, string>()
  const fixedByFieldKey = new Map<string, string>()
  if (config.fixedValues) {
    for (const [rawKey, rawValue] of Object.entries(config.fixedValues)) {
      const key = rawKey.trim()
      const normalizedKey = key.toUpperCase()
      const value = String(rawValue)
      if (/^[A-Z]+$/.test(normalizedKey)) {
        fixedByColumnLetter.set(normalizedKey, value)
      } else {
        const fieldMatch = key.match(/^field\s*:\s*(.+)$/i)
        if (fieldMatch) {
          const fieldKey = normalizeTemplateKey(fieldMatch[1] ?? '')
          if (fieldKey) {
            fixedByFieldKey.set(fieldKey, value)
          }
        }
      }
    }
  }

  // 템플릿이 없을 경우 헤더 행 생성
  if (!templateBuffer) {
    const headerRow = worksheet.getRow(config.headerRow)

    // columnMappings를 기반으로 헤더 생성 (sabangnetKey를 한글 라벨로 변환)
    const keyToLabel: Record<string, string> = {
      sabangnetOrderNumber: '사방넷주문번호',
      mallOrderNumber: '쇼핑몰주문번호',
      subOrderNumber: '부주문번호',
      productName: '상품명',
      quantity: '수량',
      optionName: '옵션',
      productAbbr: '상품약어',
      productCode: '상품코드',
      mallProductNumber: '쇼핑몰상품번호',
      modelNumber: '모델번호',
      orderName: '주문인',
      recipientName: '받는인',
      orderPhone: '주문인연락처',
      orderMobile: '주문인핸드폰',
      recipientPhone: '받는인연락처',
      recipientMobile: '받는인핸드폰',
      postalCode: '우편번호',
      address: '배송지',
      memo: '전언',
      courier: '택배사',
      trackingNumber: '송장번호',
      logisticsNote: '물류전달사항',
      shoppingMall: '사이트',
      manufacturer: '제조사',
      paymentAmount: '결제금액',
      cost: '원가',
      shippingCost: '택배비',
      fulfillmentType: '주문유형',
      cjDate: '씨제이날짜',
      collectedAt: '수집일시',
    }

    for (const [sabangnetKey, column] of Object.entries(config.columnMappings)) {
      const colIndex = columnLetterToIndex(column) + 1
      const label = keyToLabel[sabangnetKey] || sabangnetKey
      headerRow.getCell(colIndex).value = label
    }

    headerRow.commit()
  }

  // 템플릿이 있으면 첫 데이터 행을 필요한 만큼 복제해서 서식/병합/수식을 유지합니다.
  // (rowCount가 부족할 때도 동일한 스타일을 유지하기 위함)
  if (templateBuffer && orders.length > 1) {
    worksheet.duplicateRow(config.dataStartRow, orders.length - 1, true)
  }

  // 데이터 시작 행부터 주문 데이터 입력
  let currentRow = config.dataStartRow

  for (const order of orders) {
    const row = worksheet.getRow(currentRow)

    // 컬럼 연결에 따라 데이터 입력
    for (const [sabangnetKey, column] of Object.entries(config.columnMappings)) {
      const colIndex = columnLetterToIndex(column) + 1
      const value = getOrderValue(order, sabangnetKey)
      row.getCell(colIndex).value = value
    }

    // 고정값(컬럼 단위) 입력: 각 데이터 행에서 특정 열을 동일 값으로 채우고 싶을 때 사용
    // 예: { "A": "다온에프앤씨" }
    for (const [column, rawValue] of fixedByColumnLetter.entries()) {
      const colIndex = columnLetterToIndex(column) + 1
      row.getCell(colIndex).value = resolveTemplateValue(rawValue, variables, order)
    }

    // 고정값(필드 단위) 입력: 특정 사방넷 컬럼의 값을 템플릿으로 "덮어쓰기" 할 때 사용
    // 예: { "field:orderName": "{{orderName || recipientName}}" }
    for (const [sabangnetKey, rawValue] of fixedByFieldKey.entries()) {
      const column = config.columnMappings[sabangnetKey]
      if (!column) continue
      const colIndex = columnLetterToIndex(column) + 1
      row.getCell(colIndex).value = resolveTemplateValue(rawValue, variables, order)
    }

    row.commit()
    currentRow++
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ============================================
// 템플릿 기반 발주서 생성
// ============================================

/**
 * 제조사별로 주문 그룹화
 */
export function groupOrdersByManufacturer(orders: ParsedOrder[]): Map<string, ParsedOrder[]> {
  const grouped = new Map<string, ParsedOrder[]>()

  for (const order of orders) {
    const raw = order.manufacturer?.trim() ?? ''
    const isPlaceholder =
      !raw || /^[-–—]+$/.test(raw) || raw === '미지정' || raw === '미등록' || raw === '없음' || raw === 'N/A'
    const manufacturer = isPlaceholder ? '미지정' : raw
    const existing = grouped.get(manufacturer) || []
    existing.push(order)
    grouped.set(manufacturer, existing)
  }

  return grouped
}

/**
 * 엑셀 컬럼 인덱스를 문자로 변환 (0 -> A, 25 -> Z, 26 -> AA)
 */
export function indexToColumnLetter(index: number): string {
  let letter = ''
  let i = index
  while (i >= 0) {
    letter = String.fromCharCode((i % 26) + 65) + letter
    i = Math.floor(i / 26) - 1
  }
  return letter
}

/**
 * 제조사 송장 파일 파싱
 * @param buffer 엑셀 파일 버퍼
 * @param template 제조사별 송장 템플릿 설정
 * @returns 파싱된 송장 데이터 배열
 */
export async function parseInvoiceFile(
  buffer: ArrayBuffer,
  template: InvoiceTemplate,
): Promise<{ errors: ParseError[]; invoices: InvoiceRow[] }> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return {
      invoices: [],
      errors: [{ row: 0, message: '워크시트를 찾을 수 없습니다' }],
    }
  }

  const invoices: InvoiceRow[] = []
  const errors: ParseError[] = []

  // 컬럼 인덱스 계산
  const orderNumberColIdx = template.useColumnIndex ? columnLetterToIndex(template.orderNumberColumn) + 1 : -1
  const courierColIdx = template.useColumnIndex ? columnLetterToIndex(template.courierColumn) + 1 : -1
  const trackingNumberColIdx = template.useColumnIndex ? columnLetterToIndex(template.trackingNumberColumn) + 1 : -1

  // 헤더명 기반일 경우 헤더 행에서 컬럼 인덱스 찾기
  const headerMap: Map<string, number> = new Map()
  if (!template.useColumnIndex) {
    const headerRow = worksheet.getRow(template.headerRow)
    headerRow.eachCell((cell, colNumber) => {
      const value = getCellValue(cell).toLowerCase().trim()
      headerMap.set(value, colNumber)
    })
  }

  worksheet.eachRow((row, rowNumber) => {
    // 헤더 행 및 그 이전 행 스킵
    if (rowNumber < template.dataStartRow) {
      return
    }

    try {
      let orderNumber: string
      let courierName: string
      let trackingNumber: string

      if (template.useColumnIndex) {
        orderNumber = getCellValue(row.getCell(orderNumberColIdx)).trim()
        courierName = getCellValue(row.getCell(courierColIdx)).trim()
        trackingNumber = getCellValue(row.getCell(trackingNumberColIdx)).trim()
      } else {
        const orderNumberCol = headerMap.get(template.orderNumberColumn.toLowerCase())
        const courierCol = headerMap.get(template.courierColumn.toLowerCase())
        const trackingNumberCol = headerMap.get(template.trackingNumberColumn.toLowerCase())

        orderNumber = orderNumberCol ? getCellValue(row.getCell(orderNumberCol)).trim() : ''
        courierName = courierCol ? getCellValue(row.getCell(courierCol)).trim() : ''
        trackingNumber = trackingNumberCol ? getCellValue(row.getCell(trackingNumberCol)).trim() : ''
      }

      // 빈 행 스킵
      if (!orderNumber && !trackingNumber) {
        return
      }

      // 주문번호가 없으면 에러
      if (!orderNumber) {
        errors.push({
          row: rowNumber,
          message: '주문번호가 없습니다',
          data: { trackingNumber },
        })
        return
      }

      // 송장번호가 없으면 에러
      if (!trackingNumber) {
        errors.push({
          row: rowNumber,
          message: '송장번호가 없습니다',
          data: { sabangnetOrderNumber: orderNumber },
        })
        return
      }

      invoices.push({
        sabangnetOrderNumber: orderNumber,
        courierName,
        trackingNumber,
        rowIndex: rowNumber,
      })
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    }
  })

  return { invoices, errors }
}

function buildTemplateVariables(orders: ParsedOrder[], manufacturerName: string, date: Date): TemplateVariables {
  const totalQuantity = orders.reduce((sum, o) => sum + (o.quantity ?? 0), 0)
  // 결제금액은 "수량 포함" 총액이에요.
  const totalAmount = orders.reduce((sum, o) => sum + (o.paymentAmount ?? 0), 0)

  return {
    manufacturerName,
    date: formatDateForExcel(date),
    totalItems: orders.length,
    totalQuantity,
    totalAmount,
  }
}

/**
 * 날짜 포맷 (YYYY년 MM월 DD일)
 */
function formatDateForExcel(date: Date): string {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}년 ${month}월 ${day}일`
}

/**
 * 상품명 + 옵션명 조합
 */
function formatProductNameWithOption(productName: string, optionName?: string): string {
  if (!optionName || isEmptyOption(optionName)) {
    return productName
  }
  return `${productName} ${optionName}`
}

/**
 * ParsedOrder에서 특정 키의 값 가져오기
 */
function getOrderValue(order: ParsedOrder, key: string): number | string {
  const orderRecord = order as unknown as Record<string, unknown>

  // 수취인명은 주문자와 다르면 "수취인 (주문자 XXX)" 형식으로 표시
  if (key === 'recipientName') {
    return formatRecipientName(order.recipientName, order.orderName)
  }

  const value = orderRecord[key]

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'number') {
    return value
  }

  return String(value)
}

// ============================================
// 송장 변환 관련 함수들
// ============================================

/**
 * 빈 옵션 판별
 */
function isEmptyOption(optionName: string | null | undefined): boolean {
  if (!optionName) return true
  const normalized = optionName.trim().toLowerCase()
  const emptyPatterns = [/^없음$/, /^없음\s*\[.*\]$/, /^\d+\(없음\)\s*\[.*\]$/, /^none$/i, /^기본$/, /^-$/, /^$/]
  return emptyPatterns.some((pattern) => pattern.test(normalized))
}

function normalizeHeaderForMapping(raw: string): string {
  return raw.trim().replace(/\s+/g, '')
}

const TEMPLATE_KEY_ALIASES: Record<string, string> = {
  // 주문 데이터(한글 별칭)
  주문인: 'orderName',
  주문자: 'orderName',
  받는인: 'recipientName',
  수취인: 'recipientName',

  주문인연락처: 'orderPhone',
  주문인핸드폰: 'orderMobile',
  받는인연락처: 'recipientPhone',
  받는인핸드폰: 'recipientMobile',
  우편번호: 'postalCode',
  배송지: 'address',
  주소: 'address',
  전언: 'memo',
  상품명: 'productName',
  옵션: 'optionName',
  옵션명: 'optionName',
  수량: 'quantity',
  결제금액: 'paymentAmount',
  상품코드: 'productCode',
  쇼핑몰상품번호: 'mallProductNumber',
  쇼핑몰주문번호: 'mallOrderNumber',
  부주문번호: 'subOrderNumber',
  사방넷주문번호: 'sabangnetOrderNumber',
  사이트: 'shoppingMall',
  제조사: 'manufacturer',

  // 공통 변수(한글 별칭)
  제조사명: 'manufacturerName',
  날짜: 'date',
  총건수: 'totalItems',
  총수량: 'totalQuantity',
  총금액: 'totalAmount',
}

function evaluateTemplateExpression(expression: string, vars: TemplateVariables, order?: ParsedOrder): unknown {
  // 지원 문법:
  // - {{key}}
  // - {{left || right}}  (빈 문자열/undefined/null이면 오른쪽으로 fallback)
  const parts = expression
    .split('||')
    .map((part) => part.trim())
    .filter((part) => part.length > 0)

  if (parts.length === 0) {
    return ''
  }

  for (const part of parts) {
    const value = resolveTemplateVariableValue(part, vars, order)
    if (hasMeaningfulTemplateValue(value)) return value
  }

  return ''
}

function hasMeaningfulTemplateValue(value: unknown): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === 'string') return value.trim().length > 0
  return true
}

function normalizeTemplateKey(key: string): string {
  const raw = key.trim()
  if (!raw) return ''
  if (TEMPLATE_KEY_ALIASES[raw]) return TEMPLATE_KEY_ALIASES[raw]!
  const compact = raw.replace(/\s+/g, '')
  return TEMPLATE_KEY_ALIASES[compact] ?? raw
}

function resolveTemplateValue(template: string, vars: TemplateVariables, order?: ParsedOrder): number | string {
  const raw = template.trim()

  const single = raw.match(/^\{\{\s*([\s\S]+?)\s*\}\}$/)
  if (single) {
    const resolved = evaluateTemplateExpression(single[1] ?? '', vars, order)
    if (typeof resolved === 'number') return resolved
    return String(resolved ?? '')
  }

  return raw.replace(/\{\{\s*([\s\S]+?)\s*\}\}/g, (_, expr) => {
    const resolved = evaluateTemplateExpression(String(expr ?? ''), vars, order)
    if (resolved === null || resolved === undefined) return ''
    return String(resolved)
  })
}

function resolveTemplateVariableValue(key: string, vars: TemplateVariables, order?: ParsedOrder): unknown {
  const normalized = normalizeTemplateKey(key)

  if (normalized === 'manufacturerName') return vars.manufacturerName
  if (normalized === 'date') return vars.date
  if (normalized === 'totalItems') return vars.totalItems
  if (normalized === 'totalQuantity') return vars.totalQuantity
  if (normalized === 'totalAmount') return vars.totalAmount

  if (!order) {
    return ''
  }

  // 주문 데이터의 모든 필드를 변수로 접근 가능하게 해요.
  // (예: {{orderName}}, {{recipientName}}, {{address}}, {{quantity}} ...)
  const record = order as unknown as Record<string, unknown>
  const value = record[normalized]

  if (value === null || value === undefined) {
    return ''
  }

  return value
}
