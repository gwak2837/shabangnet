export function getBaseURL(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }

  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  return 'https://daonfnc.vercel.app'
}

export const SITE_CONFIG = {
  name: '다온 발주 자동화',
  shortName: '다온',
  description: '사방넷 주문 취합 및 제조사별 발주 자동화 시스템',
  locale: 'ko_KR',
  themeColor: '#141414',
} as const

export interface SabangnetColumn {
  index: number
  key: string
  label: string
  required?: boolean
}

export const SABANGNET_COLUMNS: SabangnetColumn[] = [
  { index: 0, key: 'productName', label: '상품명', required: true }, // A열
  { index: 1, key: 'quantity', label: '수량', required: true }, // B열
  { index: 2, key: 'orderName', label: '주문인' }, // C열
  { index: 3, key: 'recipientName', label: '받는인', required: true }, // D열
  { index: 4, key: 'orderPhone', label: '주문인 연락처' }, // E열
  { index: 5, key: 'orderMobile', label: '주문인 핸드폰' }, // F열
  { index: 6, key: 'recipientPhone', label: '받는인 연락처' }, // G열
  { index: 7, key: 'recipientMobile', label: '받는인 핸드폰', required: true }, // H열
  { index: 8, key: 'postalCode', label: '우편번호' }, // I열
  { index: 9, key: 'address', label: '배송지', required: true }, // J열
  { index: 10, key: 'memo', label: '전언' }, // K열
  { index: 11, key: 'shoppingMall', label: '사이트' }, // L열
  { index: 12, key: 'manufacturerName', label: '제조사', required: true }, // M열
  { index: 13, key: 'courier', label: '택배사' }, // N열
  { index: 14, key: 'trackingNumber', label: '송장번호' }, // O열
  { index: 15, key: 'mallOrderNumber', label: '쇼핑몰주문번호' }, // P열
  { index: 16, key: 'sabangnetOrderNumber', label: '사방넷주문번호', required: true }, // Q열
  { index: 17, key: 'mallProductNumber', label: '쇼핑몰상품번호' }, // R열
  { index: 18, key: 'optionName', label: '옵션' }, // S열
  { index: 19, key: 'fulfillmentType', label: 'F' }, // T열 (주문유형)
  { index: 20, key: 'paymentAmount', label: '결제금액' }, // U열
  { index: 21, key: 'productAbbr', label: '상품약어' }, // V열
  { index: 22, key: 'cjDate', label: '씨제이날짜' }, // W열
  { index: 23, key: 'logisticsNote', label: '물류전달사항' }, // X열
  { index: 24, key: 'collectedAt', label: '수집일시' }, // Y열
  { index: 25, key: 'subOrderNumber', label: '부주문번호' }, // Z열
  { index: 26, key: 'productCode', label: '품번코드' }, // [열
  { index: 27, key: 'selfProductCode', label: '자체상품코드' }, // \열
  { index: 28, key: 'modelNumber', label: '모델번호' }, // ]열
  { index: 29, key: 'cost', label: '원가(상품)*수량' }, // ^열
] as const

export const SABANGNET_COLUMN_MAP = new Map(SABANGNET_COLUMNS.map((col) => [col.key, col]))
export const SABANGNET_LABEL_MAP = new Map(SABANGNET_COLUMNS.map((col) => [col.label, col]))
