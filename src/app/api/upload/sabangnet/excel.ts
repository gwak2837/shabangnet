import ExcelJS, { CellValue } from 'exceljs'

import type { ParsedOrder, ParseError } from '@/lib/excel'

/**
 * 사방넷 원본 파일 파싱 (다온발주양식.xlsx 기준)
 * 첫 번째 행이 헤더, 두 번째 행부터 데이터
 * 13번째 열(index 12)이 제조사
 */
export async function parseSabangnetFile(buffer: ArrayBuffer) {
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

  const orders: ParsedOrder[] = []
  const errors: ParseError[] = []
  const totalRows = worksheet.rowCount

  // 첫 번째 행: 헤더
  // 두 번째 행부터: 데이터
  for (let rowNumber = 2; rowNumber <= totalRows; rowNumber++) {
    const row = worksheet.getRow(rowNumber)

    try {
      const rowData = row.values

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
    totalRows,
  }
}

const str = (val: unknown) => (val != null ? String(val).trim() : '')
const num = (val: unknown) => parseFloat(String(val ?? '').replace(/[^0-9.-]/g, '')) || 0

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
 * [5] E열: 주문인 연락처
 * [6] F열: 주문인 핸드폰
 * [7] G열: 받는인 연락처
 * [8] H열: 받는인 핸드폰
 * [9] I열: 우편번호
 * [10] J열: 배송지
 * [11] K열: 전언
 * [12] L열: 사이트
 * [13] M열: 제조사
 * [14] N열: 택배사
 * [15] O열: 송장번호
 * [16] P열: 쇼핑몰주문번호
 * [17] Q열: 사방넷주문번호
 * [18] R열: 쇼핑몰상품번호
 * [19] S열: 옵션
 * [20] T열: F (주문유형)
 * [21] U열: 결제금액
 * [22] V열: 상품약어
 * [23] W열: 씨제이날짜
 * [24] X열: 물류전달사항
 * [25] Y열: 수집일시
 * [26] Z열: 부주문번호
 * [27] [열: 품번코드
 * [28] \열: 자체상품코드
 * [29] ]열: 모델번호
 * [30] ^열: 원가(상품)*수량
 */
function mapRowToOrder(rowData: CellValue[], rowNumber: number) {
  const sabangnetOrderNumber = str(rowData[17])

  if (!sabangnetOrderNumber) {
    return null
  }

  return {
    // 주문 식별자
    sabangnetOrderNumber, // Q열: 사방넷주문번호
    mallOrderNumber: str(rowData[16]), // P열: 쇼핑몰주문번호
    subOrderNumber: str(rowData[26]), // Z열: 부주문번호

    // 상품 정보
    productName: str(rowData[1]), // A열: 상품명
    quantity: parseInt(str(rowData[2]), 10) || 1, // B열: 수량
    optionName: str(rowData[19]), // S열: 옵션
    productAbbr: str(rowData[22]), // V열: 상품약어
    productCode: str(rowData[27]) || str(rowData[28]), // [열/\열: 품번코드/자체상품코드
    mallProductNumber: str(rowData[18]), // R열: 쇼핑몰상품번호
    modelNumber: str(rowData[29]), // ]열: 모델번호

    // 주문자/수취인
    orderName: str(rowData[3]), // C열: 주문인
    recipientName: str(rowData[4]), // D열: 받는인
    orderPhone: str(rowData[5]), // E열: 주문인 연락처
    orderMobile: str(rowData[6]), // F열: 주문인 핸드폰
    recipientPhone: str(rowData[7]), // G열: 받는인 연락처
    recipientMobile: str(rowData[8]), // H열: 받는인 핸드폰

    // 배송 정보
    postalCode: str(rowData[9]), // I열: 우편번호
    address: str(rowData[10]), // J열: 배송지
    memo: str(rowData[11]), // K열: 전언
    courier: str(rowData[14]), // N열: 택배사
    trackingNumber: str(rowData[15]), // O열: 송장번호
    logisticsNote: str(rowData[24]), // X열: 물류전달사항

    // 소스/제조사
    shoppingMall: str(rowData[12]), // L열: 사이트
    manufacturer: str(rowData[13]), // M열: 제조사

    // 금액
    paymentAmount: num(rowData[21]), // U열: 결제금액
    cost: num(rowData[30]), // ^열: 원가(상품)*수량
    shippingCost: 0,

    // 주문 메타
    fulfillmentType: str(rowData[20]), // T열: F (주문유형)
    cjDate: str(rowData[23]), // W열: 씨제이날짜
    collectedAt: str(rowData[25]), // Y열: 수집일시

    // 시스템
    rowIndex: rowNumber,
  }
}
