// ============================================
// 사이트 설정
// ============================================

export const SITE_CONFIG = {
  url: 'https://daonfnc.vercel.app',
  name: '다온 발주 자동화',
  shortName: '다온',
  description: '주문 취합 및 제조사별 발주 자동화 시스템',
  locale: 'ko_KR',
  themeColor: '#171717',
} as const

// ============================================
// 사방넷 표준 컬럼 정의
// ============================================

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
]

// 컬럼 키로 빠르게 찾기 위한 맵
export const SABANGNET_COLUMN_MAP = new Map(SABANGNET_COLUMNS.map((col) => [col.key, col]))

// 컬럼 라벨로 찾기 위한 맵
export const SABANGNET_LABEL_MAP = new Map(SABANGNET_COLUMNS.map((col) => [col.label, col]))

// ============================================
// 컬럼 동의어 사전 (자동 매핑용)
// key: 사방넷 컬럼 key, values: 유사한 이름들
// ============================================

export const COLUMN_SYNONYMS: Record<string, string[]> = {
  productName: ['상품명', '상품', '품명', '품목명', '주문내역', '주문내역-1'],
  quantity: ['수량', '주문수량', '택배수량', 'qty', '갯수', '개수'],
  orderName: ['주문인', '주문자', '주문자명', '보내는분', '보내시는분', '보내는사람'],
  recipientName: ['받는인', '받는사람', '수취인', '수취인명', '인수자', '받으시는분', '받는분', '고객명'],
  orderPhone: ['주문인연락처', '주문인전화', '보내는전화', '보내시는분전화', '주문자전화'],
  orderMobile: ['주문인핸드폰', '주문인휴대폰', '보내는분핸드폰', '주문자휴대폰'],
  recipientPhone: ['받는인연락처', '받는인전화', '받는집전화', '받으시는분전화', '수취인전화', '전화1'],
  recipientMobile: [
    '핸드폰',
    '받는인핸드폰',
    '받는휴대폰',
    '받는분핸드폰',
    '수취인휴대폰',
    '수취인연락처',
    '휴대폰번호',
    '휴대전화',
    '전화2',
    '연락처',
  ],
  postalCode: ['우편', '우편번호', '우편번호호', '받는분우편번호', '수취인우편번호', 'zipcode'],
  address: ['배송지', '주소', '받는주소', '수취인주소', '배송주소', '받는분총주소', '받으시는분주소', '상세주소'],
  memo: ['전언', '배송메시지', '배송메모', '주문메모', '고객배송요청사항', '배송요청메모', '특기사항', '메모', '비고'],
  shoppingMall: ['쇼핑몰', '사이트', '판매처', '몰'],
  manufacturer: ['제조사', '업체명', '공급사', '거래처'],
  courier: ['택배', '택배사', '배송업체', '운송업체'],
  trackingNumber: ['송장번호', '운송장번호', '운송장', '송장'],
  orderNumber: ['주문번호', '주문번호(쇼핑몰)', '쇼핑몰주문번호', '사방넷주문번호', '통합주문번호', '배송번호'],
  optionName: ['옵션', '옵션명', '단품상세', '단품명'],
  paymentAmount: ['결제금액', '판매가', '금액', '결제금액(부가세포함)'],
  productCode: ['품번코드', '상품코드', '자체상품코드', '단품코드'],
  cost: ['원가(상품)', '원가', '공급금액', '매입가'],
  shippingCost: ['택배비', '배송비', '배송료', '운송비'],
}

// 역방향 동의어 맵 (동의어 -> 표준 key)
export const SYNONYM_TO_KEY_MAP: Map<string, string> = new Map()
Object.entries(COLUMN_SYNONYMS).forEach(([key, synonyms]) => {
  synonyms.forEach((synonym) => {
    SYNONYM_TO_KEY_MAP.set(synonym.toLowerCase(), key)
  })
})

// ============================================
// 자동 매핑 헬퍼 함수
// ============================================

/**
 * 두 컬럼명 배열 간 자동 매핑 수행
 * @returns { sourceColumn: targetColumn } 형태의 매핑
 */
export function autoMapColumns(sourceHeaders: string[], targetHeaders: string[]): Record<string, string> {
  const mappings: Record<string, string> = {}

  sourceHeaders.forEach((sourceHeader) => {
    const sourceKey = findSabangnetKeyByLabel(sourceHeader)
    if (!sourceKey) return

    // 타겟에서 같은 키에 해당하는 컬럼 찾기
    const synonyms = COLUMN_SYNONYMS[sourceKey] || []
    const targetHeader = targetHeaders.find((th) => {
      const normalized = th.trim().toLowerCase()
      return synonyms.some((s) => s.toLowerCase() === normalized || normalized.includes(s.toLowerCase()))
    })

    if (targetHeader) {
      mappings[sourceHeader] = targetHeader
    }
  })

  return mappings
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
 * 컬럼명으로 사방넷 표준 키 찾기
 */
export function findSabangnetKeyByLabel(label: string): string | null {
  const normalized = label.trim().toLowerCase()

  // 직접 매칭 시도
  const directMatch = SYNONYM_TO_KEY_MAP.get(normalized)
  if (directMatch) return directMatch

  // 부분 매칭 시도 (포함 관계)
  for (const [synonym, key] of SYNONYM_TO_KEY_MAP.entries()) {
    if (normalized.includes(synonym) || synonym.includes(normalized)) {
      return key
    }
  }

  return null
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
// 발송 제외 패턴 기본값
// ============================================

export const DEFAULT_EXCLUSION_PATTERNS = [
  { pattern: '[30002002]주문_센터택배', description: 'CJ온스타일 센터택배' },
  { pattern: '[30002002]주문_직택배', description: 'CJ온스타일 직택배' },
  { pattern: '현대홈직택배[제휴몰]현대이지웰', description: '현대홈쇼핑 제휴몰' },
  { pattern: '현대홈직택배', description: '현대홈쇼핑 직택배' },
]

// ============================================
// 택배사 코드 기본값
// ============================================

export const DEFAULT_COURIER_MAPPINGS = [
  { name: 'CJ대한통운', code: '04', aliases: ['CJ대한통운', 'CJ택배', 'CJ', '대한통운', 'CJGLS'] },
  { name: '한진택배', code: '05', aliases: ['한진택배', '한진', 'HANJIN'] },
  { name: '롯데택배', code: '08', aliases: ['롯데택배', '롯데', 'LOTTE', '롯데글로벌로지스'] },
  { name: '우체국택배', code: '01', aliases: ['우체국택배', '우체국', '우편', 'EPOST'] },
  { name: '로젠택배', code: '06', aliases: ['로젠택배', '로젠', 'LOGEN'] },
  { name: '경동택배', code: '23', aliases: ['경동택배', '경동', 'KD택배'] },
  { name: '대신택배', code: '22', aliases: ['대신택배', '대신'] },
  { name: '일양로지스', code: '11', aliases: ['일양로지스', '일양택배', '일양'] },
  { name: '합동택배', code: '32', aliases: ['합동택배', '합동'] },
  { name: 'GS포스트박스', code: '24', aliases: ['GS포스트박스', 'GS택배', 'CVSnet'] },
]
