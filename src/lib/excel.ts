import ExcelJS from 'exceljs'

import type { InvoiceTemplate } from '../services/manufacturers.types'

import { SABANGNET_COLUMNS } from '../common/constants'
import { findStandardKeyByLabel } from '../services/column-synonyms'

// ============================================
// 타입 정의
// ============================================

// 송장 변환 결과 (개별 건)
export interface InvoiceConvertResultItem {
  courierCode: string // 변환된 택배사 코드
  errorMessage?: string // 에러 메시지
  orderNumber: string // 사방넷 주문번호
  originalCourier?: string // 원본 택배사명 (에러 시)
  status: 'courier_error' | 'order_not_found' | 'success'
  trackingNumber: string // 송장번호
}

// 송장 파싱 결과 (개별 건)
export interface InvoiceRow {
  courierName: string // 원본 택배사명
  orderNumber: string // 주문번호
  rowIndex: number // 원본 행 번호
  trackingNumber: string // 송장번호
}

// 발주서에 포함될 주문 데이터 타입
export interface OrderData {
  address: string
  customerName: string // 수취인명
  memo?: string
  optionName: string
  orderName?: string // 주문자명
  orderNumber: string
  phone: string
  price: number
  productCode: string
  productName: string
  quantity: number
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
  fixedValues?: Record<string, string> // 고정값 (컬럼 -> 값)
  headerRow: number
}

// 사방넷 원본 파일에서 파싱된 주문 데이터
export interface ParsedOrder {
  address: string
  cost: number
  courier: string
  manufacturer: string
  memo: string
  optionName: string
  orderMobile: string
  orderName: string
  orderNumber: string
  orderPhone: string
  paymentAmount: number
  postalCode: string
  productAbbr: string
  productCode: string
  productName: string
  quantity: number
  recipientMobile: string
  recipientName: string
  recipientPhone: string
  // 원본 행 번호 (에러 추적용)
  rowIndex: number
  shippingCost: number
  shoppingMall: string
  trackingNumber: string
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
  headers: string[]
  orders: ParsedOrder[]
  totalRows: number
}

// 쇼핑몰 템플릿 설정 타입
export interface ShoppingMallConfig {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  headerRow: number
  id: string
  mallName: string
}

// 템플릿 분석 결과
export interface TemplateAnalysis {
  dataStartRow: number
  headerRow: number
  headers: string[]
  sampleData: Record<string, string>[] // 샘플 데이터 (최대 3행)
  suggestedMappings: Record<string, string> // 사방넷 key -> 템플릿 컬럼 (A, B, C...)
}

// 발주서 기본 헤더
const DEFAULT_HEADERS = [
  { key: 'orderNumber', header: '주문번호', width: 20 },
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

  // 헤더 행 찾기 (데이터가 있는 첫 번째 행)
  let headerRow = 1
  let headers: string[] = []
  let dataStartRow = 2

  worksheet.eachRow((row, rowNumber) => {
    if (headers.length === 0) {
      const rowValues: string[] = []
      let hasContent = false

      row.eachCell((cell, colNumber) => {
        const value = getCellValue(cell)
        rowValues[colNumber - 1] = value
        if (value && value.trim()) hasContent = true
      })

      if (hasContent) {
        // 첫 번째 데이터가 있는 행을 헤더로 간주
        headers = rowValues.filter((v) => v !== undefined)
        headerRow = rowNumber
        dataStartRow = rowNumber + 1
      }
    }
  })

  // 자동 매핑 제안 (DB에서 동의어 조회)
  const suggestedMappings: Record<string, string> = {}
  for (let index = 0; index < headers.length; index++) {
    const header = headers[index]
    if (!header) continue
    const sabangnetKey = await findStandardKeyByLabel(header)
    if (sabangnetKey) {
      suggestedMappings[sabangnetKey] = indexToColumnLetter(index)
    }
  }

  // 샘플 데이터 추출 (최대 3행)
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

  return {
    headers,
    headerRow,
    dataStartRow,
    suggestedMappings,
    sampleData,
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
 * 사방넷 양식으로 변환 (쇼핑몰 주문 -> 사방넷 업로드용)
 */
export async function convertToSabangnetFormat(orders: ParsedOrder[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = '(주)다온에프앤씨'
  workbook.created = new Date()

  const worksheet = workbook.addWorksheet('사방넷주문')

  // 헤더 설정
  const headers = SABANGNET_COLUMNS.map((col) => col.label)
  worksheet.addRow(headers)

  // 데이터 추가
  for (const order of orders) {
    const rowData = SABANGNET_COLUMNS.map((col) => getOrderValue(order, col.key))
    worksheet.addRow(rowData)
  }

  // 컬럼 너비 자동 조정
  worksheet.columns.forEach((column) => {
    column.width = 15
  })

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
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

// ============================================
// 파싱 함수들
// ============================================

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
      order.orderNumber,
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
    worksheet.addRow([result.orderNumber, result.courierCode, result.trackingNumber])
  }

  // 컬럼 너비 설정
  worksheet.getColumn(1).width = 25 // 사방넷주문번호
  worksheet.getColumn(2).width = 12 // 택배사코드
  worksheet.getColumn(3).width = 20 // 송장번호

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

// ============================================
// 템플릿 기반 발주서 생성
// ============================================

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

  // 템플릿이 없을 경우 헤더 행 생성
  if (!templateBuffer) {
    const headerRow = worksheet.getRow(config.headerRow)

    // columnMappings를 기반으로 헤더 생성 (sabangnetKey를 한글 라벨로 변환)
    const keyToLabel: Record<string, string> = {
      productName: '상품명',
      quantity: '수량',
      orderName: '주문인',
      recipientName: '받는인',
      orderPhone: '주문인연락처',
      orderMobile: '주문인핸드폰',
      recipientPhone: '받는인연락처',
      recipientMobile: '핸드폰',
      postalCode: '우편',
      address: '배송지',
      memo: '전언',
      shoppingMall: '쇼핑몰',
      manufacturer: '제조사',
      courier: '택배',
      trackingNumber: '송장번호',
      orderNumber: '주문번호',
      optionName: '옵션',
      paymentAmount: '결제금액',
      productCode: '상품코드',
      cost: '원가',
      shippingCost: '배송비',
    }

    for (const [sabangnetKey, column] of Object.entries(config.columnMappings)) {
      const colIndex = columnLetterToIndex(column) + 1
      const label = keyToLabel[sabangnetKey] || sabangnetKey
      headerRow.getCell(colIndex).value = label
    }

    headerRow.commit()
  }

  // 데이터 시작 행부터 주문 데이터 입력
  let currentRow = config.dataStartRow

  for (const order of orders) {
    const row = worksheet.getRow(currentRow)

    // 컬럼 매핑에 따라 데이터 입력
    for (const [sabangnetKey, column] of Object.entries(config.columnMappings)) {
      const colIndex = columnLetterToIndex(column) + 1
      const value = getOrderValue(order, sabangnetKey)
      row.getCell(colIndex).value = value
    }

    // 고정값 입력
    if (config.fixedValues) {
      for (const [column, value] of Object.entries(config.fixedValues)) {
        const colIndex = columnLetterToIndex(column) + 1
        row.getCell(colIndex).value = value
      }
    }

    row.commit()
    currentRow++
  }

  const buffer = await workbook.xlsx.writeBuffer()
  return Buffer.from(buffer)
}

/**
 * 제조사별로 주문 그룹화
 */
export function groupOrdersByManufacturer(orders: ParsedOrder[]): Map<string, ParsedOrder[]> {
  const grouped = new Map<string, ParsedOrder[]>()

  for (const order of orders) {
    const manufacturer = order.manufacturer || '미지정'
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

// ============================================
// 헬퍼 함수들
// ============================================

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
          data: { orderNumber },
        })
        return
      }

      invoices.push({
        orderNumber,
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

/**
 * 사방넷 원본 파일 파싱 (다온발주양식.xlsx 기준)
 * 첫 번째 행이 헤더, 두 번째 행부터 데이터
 * 13번째 열(index 12)이 제조사
 */
export async function parseSabangnetFile(buffer: ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return { orders: [], errors: [{ row: 0, message: '워크시트를 찾을 수 없습니다' }], headers: [], totalRows: 0 }
  }

  const orders: ParsedOrder[] = []
  const errors: ParseError[] = []
  const headers: string[] = []

  let rowIndex = 0
  worksheet.eachRow((row, rowNumber) => {
    rowIndex = rowNumber

    // 첫 번째 행 = 헤더
    if (rowNumber === 1) {
      row.eachCell((cell, colNumber) => {
        headers[colNumber - 1] = getCellValue(cell)
      })
      return
    }

    // 데이터 행 파싱
    try {
      const rowData: string[] = []
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[colNumber - 1] = getCellValue(cell)
      })

      // 빈 행 스킵
      if (rowData.every((v) => !v || v.trim() === '')) {
        return
      }

      const order = mapRowToOrder(rowData, rowNumber)
      if (order) {
        orders.push(order)
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    }
  })

  return { orders, errors, headers, totalRows: rowIndex }
}

/**
 * 쇼핑몰 파일 파싱
 */
export async function parseShoppingMallFile(buffer: ArrayBuffer, config: ShoppingMallConfig): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet) {
    return { orders: [], errors: [{ row: 0, message: '워크시트를 찾을 수 없습니다' }], headers: [], totalRows: 0 }
  }

  const orders: ParsedOrder[] = []
  const errors: ParseError[] = []
  const headers: string[] = []
  const headerColumnMap = new Map()

  let rowIndex = 0
  worksheet.eachRow((row, rowNumber) => {
    rowIndex = rowNumber

    // 헤더 행
    if (rowNumber === config.headerRow) {
      row.eachCell((cell, colNumber) => {
        const value = getCellValue(cell)
        headers[colNumber - 1] = value
        headerColumnMap.set(value, colNumber - 1)
      })
      return
    }

    // 헤더 행 이전은 스킵
    if (rowNumber < config.dataStartRow) {
      return
    }

    // 데이터 행 파싱
    try {
      const rowData: string[] = []
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        rowData[colNumber - 1] = getCellValue(cell)
      })

      // 빈 행 스킵
      if (rowData.every((v) => !v || v.trim() === '')) {
        return
      }

      const order = mapShoppingMallRowToOrder(rowData, headers, headerColumnMap, config, rowNumber)
      if (order) {
        orders.push(order)
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    }
  })

  return { orders, errors, headers, totalRows: rowIndex }
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

// ============================================
// 송장 변환 관련 함수들
// ============================================

/**
 * 셀 값을 문자열로 변환
 */
function getCellValue(cell: ExcelJS.Cell): string {
  const value = cell.value

  if (value === null || value === undefined) {
    return ''
  }

  if (typeof value === 'object') {
    // RichText
    if ('richText' in value) {
      return value.richText.map((rt) => rt.text).join('')
    }
    // Hyperlink
    if ('hyperlink' in value && 'text' in value) {
      return String(value.text)
    }
    // Formula
    if ('formula' in value && 'result' in value) {
      return String(value.result ?? '')
    }
    // Date
    if (value instanceof Date) {
      return value.toISOString().split('T')[0]
    }
    return String(value)
  }

  return String(value)
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

/**
 * 빈 옵션 판별
 */
function isEmptyOption(optionName: string | null | undefined): boolean {
  if (!optionName) return true
  const normalized = optionName.trim().toLowerCase()
  const emptyPatterns = [/^없음$/, /^없음\s*\[.*\]$/, /^\d+\(없음\)\s*\[.*\]$/, /^none$/i, /^기본$/, /^-$/, /^$/]
  return emptyPatterns.some((pattern) => pattern.test(normalized))
}

/**
 * 사방넷 행 데이터를 ParsedOrder로 변환
 */
function mapRowToOrder(rowData: string[], rowNumber: number): ParsedOrder | null {
  // 주문번호가 없으면 스킵 (필수 필드)
  const orderNumber = rowData[15]?.trim() || ''
  if (!orderNumber) {
    return null
  }

  return {
    orderNumber,
    productName: rowData[0]?.trim() || '',
    quantity: parseInt(rowData[1], 10) || 1,
    orderName: rowData[2]?.trim() || '',
    recipientName: rowData[3]?.trim() || '',
    orderPhone: rowData[4]?.trim() || '',
    orderMobile: rowData[5]?.trim() || '',
    recipientPhone: rowData[6]?.trim() || '',
    recipientMobile: rowData[7]?.trim() || '',
    postalCode: rowData[8]?.trim() || '',
    address: rowData[9]?.trim() || '',
    memo: rowData[10]?.trim() || '',
    shoppingMall: rowData[11]?.trim() || '',
    manufacturer: rowData[12]?.trim() || '', // 제조사 (13번째 열, index 12)
    courier: rowData[13]?.trim() || '',
    trackingNumber: rowData[14]?.trim() || '',
    optionName: rowData[18]?.trim() || '',
    paymentAmount: parseFloat(rowData[19]?.replace(/[^0-9.-]/g, '') || '0') || 0,
    productAbbr: rowData[20]?.trim() || '',
    productCode: rowData[25]?.trim() || rowData[26]?.trim() || '',
    cost: parseFloat(rowData[28]?.replace(/[^0-9.-]/g, '') || '0') || 0,
    shippingCost: parseFloat(rowData[29]?.replace(/[^0-9.-]/g, '') || '0') || 0,
    rowIndex: rowNumber,
  }
}

/**
 * 쇼핑몰 행 데이터를 ParsedOrder로 변환
 */
function mapShoppingMallRowToOrder(
  rowData: string[],
  headers: string[],
  headerColumnMap: Map<string, number>,
  config: ShoppingMallConfig,
  rowNumber: number,
): ParsedOrder | null {
  const getValue = (sabangnetKey: string): string => {
    // config.columnMappings에서 쇼핑몰 컬럼명 찾기
    const mallColumn = Object.entries(config.columnMappings).find(([, sKey]) => sKey === sabangnetKey)?.[0]
    if (!mallColumn) return ''

    const colIndex = headerColumnMap.get(mallColumn)
    if (colIndex === undefined) return ''

    return rowData[colIndex]?.trim() || ''
  }

  const orderNumber = getValue('orderNumber')
  if (!orderNumber) {
    return null
  }

  return {
    orderNumber,
    productName: getValue('productName'),
    quantity: parseInt(getValue('quantity'), 10) || 1,
    orderName: getValue('orderName'),
    recipientName: getValue('recipientName'),
    orderPhone: getValue('orderPhone'),
    orderMobile: getValue('orderMobile'),
    recipientPhone: getValue('recipientPhone'),
    recipientMobile: getValue('recipientMobile'),
    postalCode: getValue('postalCode'),
    address: getValue('address'),
    memo: getValue('memo'),
    shoppingMall: config.displayName,
    manufacturer: getValue('manufacturer') || '', // 쇼핑몰은 제조사 컬럼이 없을 수 있음
    courier: getValue('courier'),
    trackingNumber: getValue('trackingNumber'),
    optionName: getValue('optionName'),
    paymentAmount: parseFloat(getValue('paymentAmount')?.replace(/[^0-9.-]/g, '') || '0') || 0,
    productAbbr: getValue('productAbbr'),
    productCode: getValue('productCode'),
    cost: parseFloat(getValue('cost')?.replace(/[^0-9.-]/g, '') || '0') || 0,
    shippingCost: parseFloat(getValue('shippingCost')?.replace(/[^0-9.-]/g, '') || '0') || 0,
    rowIndex: rowNumber,
  }
}
