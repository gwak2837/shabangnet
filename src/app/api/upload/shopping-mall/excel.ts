import ExcelJS from 'exceljs'

import type { ParseError } from '@/lib/excel'

import { getCellValue } from '@/lib/excel/util'

export interface ShoppingMallConfig {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  fixedValues?: Record<string, string>
  headerRow: number
  mallName: string
}

/**
 * 쇼핑몰 주문 파일 파싱
 * columnMappings를 기반으로 동적으로 컬럼을 연결
 */
export async function parseShoppingMallFile(buffer: ArrayBuffer, config: ShoppingMallConfig) {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]

  if (!worksheet) {
    return {
      orders: [],
      errors: [{ row: 0, message: '워크시트를 찾을 수 없어요' }],
      totalRows: 0,
    }
  }

  const orders = []
  const errors: ParseError[] = []
  const totalRows = worksheet.rowCount
  const columnCount = worksheet.columnCount

  // 헤더 파싱
  const headerRow = worksheet.getRow(config.headerRow)
  const headerColumnMap = new Map<string, number>()

  for (let col = 1; col <= columnCount; col++) {
    const value = getCellValue(headerRow.getCell(col))
    if (value) {
      // 동일한 헤더명이 여러 번 나오는 쇼핑몰 파일이 있어요.
      // 이 경우 마지막 값으로 덮어쓰면 연결이 뒤틀릴 수 있어서, "첫 번째 등장"을 기준으로 고정합니다.
      if (!headerColumnMap.has(value)) {
        headerColumnMap.set(value, col)
      }
    }
  }

  // 헤더 검증: columnMappings의 엑셀 컬럼명이 파일에 있는지 확인
  const expectedColumns = Object.keys(config.columnMappings)
  const missingColumns = expectedColumns.filter((col) => !headerColumnMap.has(col))

  if (missingColumns.length > 0) {
    return {
      orders: [],
      errors: [{ row: 0, message: `파일 양식이 일치하지 않아요. 누락된 열: ${missingColumns.join(', ')}` }],
      totalRows,
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
) {
  // DB 필드명으로 엑셀 셀 값을 가져오는 함수
  const str = (dbField: string): string => {
    // columnMappings에서 해당 DB 필드에 연결된 엑셀 컬럼명 찾기
    const excelColumn = Object.entries(config.columnMappings).find(([, field]) => field === dbField)?.[0]
    if (!excelColumn) {
      return config.fixedValues?.[dbField]?.trim() ?? ''
    }

    // 엑셀 컬럼명으로 컬럼 인덱스 찾기
    const colIndex = headerColumnMap.get(excelColumn)
    if (colIndex === undefined) {
      return config.fixedValues?.[dbField]?.trim() ?? ''
    }

    const cell = rowData[colIndex]?.trim() || ''
    if (cell.length > 0) return cell
    return config.fixedValues?.[dbField]?.trim() ?? ''
  }

  const num = (dbField: string): number => parseFloat(str(dbField).replace(/[^0-9.-]/g, '')) || 0

  // sabangnetOrderNumber는 필수 (UNIQUE KEY)
  const sabangnetOrderNumber = str('sabangnetOrderNumber')
  if (!sabangnetOrderNumber) {
    return null
  }

  const mallProductNumber = str('mallProductNumber')
  if (!mallProductNumber) {
    throw new Error('쇼핑몰상품번호가 없어요')
  }

  const site = config.displayName.trim()
  if (!site) {
    throw new Error('사이트 값이 없어요')
  }

  // "상품코드"는 (사이트 + 쇼핑몰상품번호) 조합을 사용합니다.
  const productKey = `${site}::${mallProductNumber}`

  return {
    sabangnetOrderNumber,
    mallOrderNumber: str('mallOrderNumber'),
    subOrderNumber: str('subOrderNumber'),
    productName: str('productName'),
    quantity: parseInt(str('quantity'), 10) || 1,
    optionName: str('optionName'),
    productAbbr: str('productAbbr'),
    productCode: productKey,
    mallProductNumber,
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
    shoppingMall: site,
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
