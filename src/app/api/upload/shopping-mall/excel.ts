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
 */
export async function parseShoppingMallFile(buffer: ArrayBuffer, config: ShoppingMallConfig): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)
  const worksheet = workbook.worksheets[0]

  if (!worksheet) {
    return {
      orders: [],
      errors: [{ row: 0, message: '워크시트를 찾을 수 없습니다' }],
      headers: [],
      totalRows: 0,
    }
  }

  const orders: ParsedOrder[] = []
  const errors: ParseError[] = []
  const totalRows = worksheet.rowCount
  const columnCount = worksheet.columnCount
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

  for (let rowNumber = config.dataStartRow; rowNumber <= totalRows; rowNumber++) {
    const row = worksheet.getRow(rowNumber)
    const rowData: string[] = []

    try {
      for (let col = 1; col <= columnCount; col++) {
        rowData[col] = getCellValue(row.getCell(col))
      }

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

function mapRowToOrder(
  rowData: string[],
  rowNumber: number,
  headerColumnMap: Map<string, number>,
  config: ShoppingMallConfig,
): ParsedOrder | null {
  const str = (key: string): string => {
    const mallColumn = Object.entries(config.columnMappings).find(([, sKey]) => sKey === key)?.[0]
    if (!mallColumn) return ''

    const colIndex = headerColumnMap.get(mallColumn)
    if (colIndex === undefined) return ''

    return rowData[colIndex]?.trim() || ''
  }

  const num = (key: string): number => parseFloat(str(key).replace(/[^0-9.-]/g, '')) || 0
  const orderNumber = str('orderNumber')

  if (!orderNumber) {
    return null
  }

  return {
    orderNumber,
    productName: str('productName'),
    quantity: parseInt(str('quantity'), 10) || 1,
    orderName: str('orderName'),
    recipientName: str('recipientName'),
    orderPhone: str('orderPhone'),
    orderMobile: str('orderMobile'),
    recipientPhone: str('recipientPhone'),
    recipientMobile: str('recipientMobile'),
    postalCode: str('postalCode'),
    address: str('address'),
    memo: str('memo'),
    shoppingMall: config.displayName,
    manufacturer: str('manufacturer'),
    courier: str('courier'),
    trackingNumber: str('trackingNumber'),
    optionName: str('optionName'),
    paymentAmount: num('paymentAmount'),
    productAbbr: str('productAbbr'),
    productCode: str('productCode'),
    cost: num('cost'),
    shippingCost: num('shippingCost'),
    rowIndex: rowNumber,
  }
}
