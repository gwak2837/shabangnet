import ExcelJS from 'exceljs'

// 발주서에 포함될 주문 데이터 타입
export interface OrderData {
  orderNumber: string
  customerName: string
  phone: string
  address: string
  productCode: string
  productName: string
  optionName: string
  quantity: number
  price: number
  memo?: string
}

// 제조사별 발주서 생성 옵션
export interface OrderSheetOptions {
  manufacturerName: string
  orders: OrderData[]
  date?: Date
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
    const row = worksheet.addRow([
      order.orderNumber,
      order.customerName,
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
 * 날짜 포맷 (YYYYMMDD)
 */
export function formatDateForFileName(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
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
 * 빈 옵션 판별
 */
function isEmptyOption(optionName: string | undefined | null): boolean {
  if (!optionName) return true
  const normalized = optionName.trim().toLowerCase()
  const emptyPatterns = [/^없음$/, /^없음\s*\[.*\]$/, /^\d+\(없음\)\s*\[.*\]$/, /^none$/i, /^기본$/, /^-$/, /^$/]
  return emptyPatterns.some((pattern) => pattern.test(normalized))
}

/**
 * 발주서 파일명 생성
 */
export function generateOrderFileName(manufacturerName: string, date: Date = new Date()): string {
  return `[다온에프앤씨 발주서]_${manufacturerName}_${formatDateForFileName(date)}.xlsx`
}
