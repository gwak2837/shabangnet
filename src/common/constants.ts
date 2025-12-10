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

// 다온발주양식.xlsx 기준 사방넷 컬럼 정의
export const SABANGNET_COLUMNS: SabangnetColumn[] = [
  { index: 0, key: 'productName', label: '상품명', required: true },
  { index: 1, key: 'quantity', label: '수량', required: true },
  { index: 2, key: 'orderName', label: '주문인' },
  { index: 3, key: 'recipientName', label: '받는인', required: true },
  { index: 4, key: 'orderPhone', label: '주문인연락처' },
  { index: 5, key: 'orderMobile', label: '주문인핸드폰' },
  { index: 6, key: 'recipientPhone', label: '받는인연락처' },
  { index: 7, key: 'recipientMobile', label: '핸드폰', required: true },
  { index: 8, key: 'postalCode', label: '우편' },
  { index: 9, key: 'address', label: '배송지', required: true },
  { index: 10, key: 'memo', label: '전언' },
  { index: 11, key: 'shoppingMall', label: '쇼핑몰' },
  { index: 12, key: 'manufacturer', label: '제조사', required: true },
  { index: 13, key: 'courier', label: '택배' },
  { index: 14, key: 'trackingNumber', label: '송장번호' },
  { index: 15, key: 'orderNumber', label: '주문번호', required: true },
  { index: 16, key: 'reserved1', label: '예비1' },
  { index: 17, key: 'reserved2', label: '예비2' },
  { index: 18, key: 'optionName', label: '옵션' },
  { index: 19, key: 'paymentAmount', label: '결제금액' },
  { index: 20, key: 'productAbbr', label: '상품약어' },
  { index: 21, key: 'cjDate', label: '씨제이날짜' },
  { index: 22, key: 'logisticsMemo', label: '물류전달사항' },
  { index: 23, key: 'collectedAt', label: '수집일시' },
  { index: 24, key: 'subOrderNumber', label: '부주문번호' },
  { index: 25, key: 'productCode', label: '품번코드' },
  { index: 26, key: 'selfProductCode', label: '자체상품코드' },
  { index: 27, key: 'modelNumber', label: '모델번호' },
  { index: 28, key: 'cost', label: '원가(상품)' },
  { index: 29, key: 'shippingCost', label: '택배비' },
] as const

export const SABANGNET_COLUMN_MAP = new Map(SABANGNET_COLUMNS.map((col) => [col.key, col]))
export const SABANGNET_LABEL_MAP = new Map(SABANGNET_COLUMNS.map((col) => [col.label, col]))
