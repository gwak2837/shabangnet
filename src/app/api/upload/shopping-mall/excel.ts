import ExcelJS from 'exceljs'

import type { ParsedOrder, ParseError, ParseResult } from '@/lib/excel'

import { getCellValue } from '@/lib/excel/util'

export interface ShoppingMallConfig {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  headerRow: number
  mallName: string
}

/**
 * 쇼핑몰 주문 파일 파싱
 * columnMappings를 기반으로 동적으로 컬럼을 매핑
 */
export async function parseShoppingMallFile(buffer: ArrayBuffer, config: ShoppingMallConfig): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]

  if (!worksheet) {
    return {
      orders: [],
      errors: [{ row: 0, message: '워크시트를 찾을 수 없어요' }],
      headers: [],
      totalRows: 0,
    }
  }

  const orders: ParsedOrder[] = []
  const errors: ParseError[] = []
  const totalRows = worksheet.rowCount
  const columnCount = worksheet.columnCount

  // 헤더 파싱
  const headerRow = worksheet.getRow(config.headerRow)
  const headers: string[] = []
  const headerColumnMap = new Map<string, number>()

  for (let col = 1; col <= columnCount; col++) {
    const value = getCellValue(headerRow.getCell(col))
    headers[col - 1] = value
    if (value) {
      headerColumnMap.set(value, col)
    }
  }

  // 데이터 파싱
  for (let rowNumber = config.dataStartRow; rowNumber <= totalRows; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const rowData: string[] = []

    try {
      for (let col = 1; col <= columnCount; col++) {
        rowData[col] = getCellValue(row.getCell(col))
      }

      // 빈 행 스킵
      if (rowData.every((v) => !v || v.trim() === '')) {
        continue
      }

      const order = mapRowToOrder(rowData, rowNumber, headerColumnMap, config)

      if (order) {
        orders.push(order)
      }
    } catch (error) {
      errors.push({
        row: rowNumber,
        message: error instanceof Error ? error.message : '알 수 없는 오류',
      })
    }
  }

  return {
    orders,
    errors,
    headers,
    totalRows,
  }
}

/**
 * 쇼핑몰 행 데이터를 ParsedOrder로 변환
 * columnMappings: { 엑셀컬럼명: DB필드명 }
 */
function mapRowToOrder(
  rowData: string[],
  rowNumber: number,
  headerColumnMap: Map<string, number>,
  config: ShoppingMallConfig,
): ParsedOrder | null {
  // DB 필드명으로 엑셀 셀 값을 가져오는 함수
  const str = (dbField: string): string => {
    // columnMappings에서 해당 DB 필드에 매핑된 엑셀 컬럼명 찾기
    const excelColumn = Object.entries(config.columnMappings).find(([, field]) => field === dbField)?.[0]
    if (!excelColumn) return ''

    // 엑셀 컬럼명으로 컬럼 인덱스 찾기
    const colIndex = headerColumnMap.get(excelColumn)
    if (colIndex === undefined) return ''

    return rowData[colIndex]?.trim() || ''
  }

  const num = (dbField: string): number => parseFloat(str(dbField).replace(/[^0-9.-]/g, '')) || 0

  // sabangnetOrderNumber는 필수 (UNIQUE KEY)
  const sabangnetOrderNumber = str('sabangnetOrderNumber')
  if (!sabangnetOrderNumber) {
    return null
  }

  return {
    sabangnetOrderNumber,
    mallOrderNumber: str('mallOrderNumber'),
    subOrderNumber: str('subOrderNumber'),
    productName: str('productName'),
    quantity: parseInt(str('quantity'), 10) || 1,
    optionName: str('optionName'),
    productAbbr: str('productAbbr'),
    productCode: str('productCode'),
    mallProductNumber: str('mallProductNumber'),
    modelNumber: str('modelNumber'),
    orderName: str('orderName'),
    recipientName: str('recipientName'),
    orderPhone: str('orderPhone'),
    orderMobile: str('orderMobile'),
    recipientPhone: str('recipientPhone'),
    recipientMobile: str('recipientMobile'),
    postalCode: str('postalCode'),
    address: str('address'),
    memo: str('memo'),
    courier: str('courier'),
    trackingNumber: str('trackingNumber'),
    logisticsNote: str('logisticsNote'),
    shoppingMall: config.displayName,
    manufacturer: str('manufacturerName'),
    paymentAmount: num('paymentAmount'),
    cost: num('cost'),
    shippingCost: num('shippingCost'),
    fulfillmentType: str('fulfillmentType'),
    cjDate: str('cjDate'),
    collectedAt: str('collectedAt'),
    rowIndex: rowNumber,
  }
}
