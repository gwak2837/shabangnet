import ExcelJS, { CellValue } from 'exceljs'

import type { ParsedOrder, ParseError, ParseResult } from '@/lib/excel'

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
  const headerRow = worksheet.getRow(1)
  const headers = headerRow.values as string[]

  // 첫 번째 행: 헤더
  // 두 번째 행부터: 데이터
  for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
    const row = worksheet.getRow(rowNumber)

    try {
      const rowData = row.values

      // 빈 행 스킵
      if (!rowData || !Array.isArray(rowData) || rowData.every((v) => !v || String(v).trim() === '')) {
        continue
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
  }

  return {
    orders,
    errors,
    headers,
    totalRows,
  }
}

/**
 * 사방넷 행 데이터를 ParsedOrder로 변환
 *
 * row.values는 1-based 배열 (index 0 = undefined, A열 = index 1)
 *
 * 컬럼 매핑:
 * [1] A열: 상품명
 * [2] B열: 수량
 * [3] C열: 주문인
 * [4] D열: 받는인
 * [5] E열: 주문인연락처
 * [6] F열: 주문인핸드폰
 * [7] G열: 받는인연락처
 * [8] H열: 받는인핸드폰
 * [9] I열: 우편번호
 * [10] J열: 배송지
 * [11] K열: 전언
 * [12] L열: 사이트
 * [13] M열: 제조사
 * [14] N열: 택배사
 * [15] O열: 송장번호
 * [16] P열: 쇼핑몰주문번호
 * [19] S열: 옵션
 * [20] T열: F (주문유형) - 제외 패턴 체크용
 * [21] U열: 결제금액
 * [22] V열: 상품약어
 * [27] [열: 품번코드
 * [28] \열: 자체상품코드
 * [30] ^열: 원가(상품)*수량
 */
function mapRowToOrder(rowData: CellValue[], rowNumber: number): ParsedOrder | null {
  const str = (val: unknown) => (val != null ? String(val).trim() : '')
  const num = (val: unknown) => parseFloat(String(val ?? '').replace(/[^0-9.-]/g, '')) || 0

  const orderNumber = str(rowData[16])

  if (!orderNumber) {
    return null
  }

  return {
    orderNumber,
    productName: str(rowData[1]),
    quantity: parseInt(str(rowData[2]), 10) || 1,
    orderName: str(rowData[3]),
    recipientName: str(rowData[4]),
    orderPhone: str(rowData[5]),
    orderMobile: str(rowData[6]),
    recipientPhone: str(rowData[7]),
    recipientMobile: str(rowData[8]),
    postalCode: str(rowData[9]),
    address: str(rowData[10]),
    memo: str(rowData[11]),
    shoppingMall: str(rowData[12]),
    manufacturer: str(rowData[13]),
    courier: str(rowData[14]),
    trackingNumber: str(rowData[15]),
    optionName: str(rowData[19]),
    fulfillmentType: str(rowData[20]),
    paymentAmount: num(rowData[21]),
    productAbbr: str(rowData[22]),
    productCode: str(rowData[27]) || str(rowData[28]),
    cost: num(rowData[30]),
    shippingCost: 0,
    rowIndex: rowNumber,
  }
}
