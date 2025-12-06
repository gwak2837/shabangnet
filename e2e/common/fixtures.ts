import path from 'path'

// 테스트 데이터 경로
export const TEST_DATA_DIR = path.join(__dirname, '../../public/data/real-data')

// 입력 파일 경로
export const INPUT_FILES = {
  sabangnet: path.join(TEST_DATA_DIR, '사방넷 원본파일 수정본.xlsx'),
  samsungCard: path.join(TEST_DATA_DIR, '삼성카드 원본 1203.xlsx'),
  samsungWelfare: path.join(TEST_DATA_DIR, '삼성복지원본 1203.xlsx'),
  skOriginal: path.join(TEST_DATA_DIR, 'sk원본1203.xlsx'),
} as const

// 쇼핑몰 변환 후 예상 결과 파일
export const SHOPPING_MALL_CONVERTED = {
  samsungCard: path.join(TEST_DATA_DIR, '삼성카드1203.xlsx'),
  samsungWelfare: path.join(TEST_DATA_DIR, '삼성복지1203.xlsx'),
  sk: path.join(TEST_DATA_DIR, 'sk1203.xlsx'),
} as const

// ============================================================================
// 핵심 검증 컬럼 정의 (유연한 비교용)
// ============================================================================

/** 발주서 핵심 검증 컬럼 - 배송 정보 */
export const CORE_COLUMNS_DELIVERY = ['수취인명', '받는인', '연락처', '핸드폰', '주소', '배송지', '우편번호'] as const

/** 발주서 핵심 검증 컬럼 - 주문 정보 */
export const CORE_COLUMNS_ORDER = ['상품명', '옵션명', '옵션', '수량'] as const

/** 발주서 핵심 검증 컬럼 - 매칭 키 */
export const CORE_COLUMNS_KEYS = ['사방넷주문번호', '주문번호'] as const

/** 발주서 전체 핵심 컬럼 */
export const CORE_COLUMNS_ORDER_FORM = [
  ...CORE_COLUMNS_DELIVERY,
  ...CORE_COLUMNS_ORDER,
  ...CORE_COLUMNS_KEYS,
] as const

/** 쇼핑몰 변환 후 필수 컬럼 (사방넷 양식) */
export const CORE_COLUMNS_SABANGNET = [
  '상품명',
  '수량',
  '주문인',
  '받는인',
  '주문인 연락처',
  '받는인 연락처',
  '받는인 핸드폰',
  '우편번호',
  '배송지',
  '사이트',
  '제조사',
] as const

/** 송장 변환 출력 컬럼 */
export const CORE_COLUMNS_INVOICE = ['사방넷주문번호', '택배사코드', '송장번호'] as const

// ============================================================================
// 제조사별 테스트 케이스
// ============================================================================

// 제조사별 테스트 케이스 타입
interface ManufacturerTestCase {
  /** 비교할 핵심 컬럼 (지정 시 해당 컬럼만 비교) */
  coreColumns?: readonly string[]
  /** 예상 출력 파일 경로 */
  expectedFile: string
  /** 예상 주문 건수 */
  expectedOrderCount: number
  /** 파일명에 사용되는 제조사명 (발주서 다운로드 시 사용) */
  fileNameKey?: string
  /** 제조사명 (DB에 등록된 이름) */
  manufacturer: string
}

// 사방넷 원본 파일 기반 제조사별 테스트 케이스
// manufacturers.json과 다온발주양식_*.xlsx 파일 매핑
export const SABANGNET_TEST_CASES: ManufacturerTestCase[] = [
  // 주문 건수 상위 제조사 (Golden File 비교 대상)
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_하늘명인.xlsx'),
    expectedOrderCount: 24,
    manufacturer: '하늘명인',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_로뎀푸드.xlsx'),
    expectedOrderCount: 18,
    manufacturer: '로뎀푸드',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '고창베리 다온발주양식.xlsx'),
    expectedOrderCount: 12,
    fileNameKey: '고창베리',
    manufacturer: '고창베리세상',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_웰토.xlsx'),
    expectedOrderCount: 11,
    fileNameKey: '웰토',
    manufacturer: '(주)웰토',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_미귤.xlsx'),
    expectedOrderCount: 6,
    fileNameKey: '미귤',
    manufacturer: '미귤농산',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_장어.xlsx'),
    expectedOrderCount: 5,
    fileNameKey: '장어',
    manufacturer: '고창베리세상_장어양식',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_땡큐땡초장.xlsx'),
    expectedOrderCount: 4,
    fileNameKey: '땡큐땡초장',
    manufacturer: '땡큐떙초장',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_여량.xlsx'),
    expectedOrderCount: 4,
    fileNameKey: '여량',
    manufacturer: '여량농협',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_일조.xlsx'),
    expectedOrderCount: 4,
    manufacturer: '일조',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_워커힐 SUPEX.xlsx'),
    expectedOrderCount: 3,
    fileNameKey: '워커힐 SUPEX',
    manufacturer: '워커힐_슈펙스',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_더키친.xlsx'),
    expectedOrderCount: 2,
    fileNameKey: '더키친',
    manufacturer: '더키친다이어리',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_마루영농.xlsx'),
    expectedOrderCount: 2,
    manufacturer: '마루영농',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_정읍귀리.xlsx'),
    expectedOrderCount: 2,
    fileNameKey: '정읍귀리',
    manufacturer: '정읍귀리명품화사업단',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_총체.xlsx'),
    expectedOrderCount: 2,
    fileNameKey: '총체',
    manufacturer: '총체보리한우',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_태백.xlsx'),
    expectedOrderCount: 2,
    fileNameKey: '태백',
    manufacturer: '태백산채',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_두리반.xlsx'),
    expectedOrderCount: 1,
    manufacturer: '두리반',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_상주.xlsx'),
    expectedOrderCount: 1,
    fileNameKey: '상주',
    manufacturer: '상주곶감유통센터',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_채담.xlsx'),
    expectedOrderCount: 1,
    manufacturer: '채담',
  },
  {
    expectedFile: path.join(TEST_DATA_DIR, '다온발주양식_워커힐.xlsx'),
    expectedOrderCount: 1,
    fileNameKey: '워커힐',
    manufacturer: '워커힐호텔김치',
  },
]

// 예상 출력 파일이 없어서 주문 건수만 검증하는 제조사들
export const COUNT_ONLY_TEST_CASES: Omit<ManufacturerTestCase, 'expectedFile'>[] = [
  { expectedOrderCount: 9, manufacturer: '봉동들녘' },
  { expectedOrderCount: 7, manufacturer: '미듬영농조합법인' },
  { expectedOrderCount: 6, manufacturer: '대성농협' },
  { expectedOrderCount: 4, manufacturer: '성지에프앤비' },
  { expectedOrderCount: 3, manufacturer: '가우야' },
  { expectedOrderCount: 3, manufacturer: '솔트바이오' },
  { expectedOrderCount: 3, manufacturer: '이노푸드코리아' },
  { expectedOrderCount: 3, manufacturer: '중화농협' },
  { expectedOrderCount: 3, manufacturer: '한계령웰빙' },
  { expectedOrderCount: 3, manufacturer: '허브인허브' },
  { expectedOrderCount: 2, manufacturer: '(주)와이에스' },
  { expectedOrderCount: 2, manufacturer: '국보수산' },
  { expectedOrderCount: 2, manufacturer: '순수한우협동조합' },
  { expectedOrderCount: 2, manufacturer: '안동양반간고등어' },
  { expectedOrderCount: 2, manufacturer: '이도수향촌' },
  { expectedOrderCount: 1, manufacturer: '(주)콩세상' },
  { expectedOrderCount: 1, manufacturer: '고향노을' },
  { expectedOrderCount: 1, manufacturer: '라치나타' },
  { expectedOrderCount: 1, manufacturer: '보성군농협쌀조합공동사업법인' },
  { expectedOrderCount: 1, manufacturer: '심플잇' },
  { expectedOrderCount: 1, manufacturer: '양봉농협' },
  { expectedOrderCount: 1, manufacturer: '하성에프앤비' },
  { expectedOrderCount: 1, manufacturer: '함평' },
  { expectedOrderCount: 1, manufacturer: '횡성축협' },
]

// 쇼핑몰 변환 테스트 케이스
interface ShoppingMallTestCase {
  /** 변환 후 예상 결과 파일 (사방넷 양식) */
  convertedFile: string
  /** 쇼핑몰 선택 드롭다운에서의 옵션명 */
  dropdownOption: string
  /** 쇼핑몰 이름 */
  mallName: string
  /** 원본 파일 경로 */
  originalFile: string
}

export const SHOPPING_MALL_TEST_CASES: ShoppingMallTestCase[] = [
  {
    convertedFile: SHOPPING_MALL_CONVERTED.sk,
    dropdownOption: 'SK스토아',
    mallName: 'SK스토아',
    originalFile: INPUT_FILES.skOriginal,
  },
  {
    convertedFile: SHOPPING_MALL_CONVERTED.samsungWelfare,
    dropdownOption: '삼성복지몰',
    mallName: '삼성복지몰',
    originalFile: INPUT_FILES.samsungWelfare,
  },
  {
    convertedFile: SHOPPING_MALL_CONVERTED.samsungCard,
    dropdownOption: '삼성카드몰',
    mallName: '삼성카드몰',
    originalFile: INPUT_FILES.samsungCard,
  },
]

// 테스트 계정 정보
export const TEST_USER = {
  email: 'test@e2e.local',
  password: 'Test1234!',
}

// 전체 제조사 수 (분류 검증용)
export const TOTAL_MANUFACTURERS_IN_SABANGNET = 42

// 전체 주문 수 (사방넷 원본 파일 기준)
export const TOTAL_ORDERS_IN_SABANGNET = 278

// ============================================================================
// 송장 변환 테스트 케이스
// ============================================================================

/** 송장 변환 테스트 케이스 타입 */
interface InvoiceTestCase {
  /** 송장 변환 후 예상 결과 파일 (사방넷 송장 양식) */
  convertedFile?: string
  /** 제조사명 */
  manufacturer: string
  /** 제조사 송장 원본 파일 */
  originalFile?: string
}

/**
 * 송장 변환 테스트 케이스
 * 참고: 현재 real-data 폴더에 송장 테스트 데이터 파일이 없음
 * 추후 송장 테스트 데이터가 추가되면 이 배열에 케이스 추가
 */
export const INVOICE_TEST_CASES: InvoiceTestCase[] = [
  // TODO: 송장 테스트 데이터 파일 추가 시 케이스 정의
  // {
  //   manufacturer: '하늘명인',
  //   originalFile: path.join(TEST_DATA_DIR, '하늘명인_송장원본.xlsx'),
  //   convertedFile: path.join(TEST_DATA_DIR, '사방넷_송장업로드_하늘명인.xlsx'),
  // },
]

// ============================================================================
// 유연한 비교 옵션 프리셋
// ============================================================================

/** 발주서 비교용 기본 옵션 */
export const FLEXIBLE_COMPARE_OPTIONS_ORDER = {
  coreColumns: [...CORE_COLUMNS_ORDER_FORM],
  dateOnly: true,
  headerRow: 1,
  ignoreEmptyCells: true,
  ignoreRowOrder: false,
  normalizeAddresses: true,
  normalizePhoneNumbers: true,
  numericTolerance: 0.01,
  trimWhitespace: true,
} as const

/** 발주서 비교용 옵션 (키 컬럼 기준 행 매칭) */
export const FLEXIBLE_COMPARE_OPTIONS_ORDER_KEYED = {
  ...FLEXIBLE_COMPARE_OPTIONS_ORDER,
  ignoreRowOrder: true,
  keyColumn: '사방넷주문번호',
} as const

/** 쇼핑몰 변환 결과 비교용 옵션 */
export const FLEXIBLE_COMPARE_OPTIONS_SHOPPING_MALL = {
  coreColumns: [...CORE_COLUMNS_SABANGNET],
  dateOnly: true,
  headerRow: 1,
  ignoreEmptyCells: true,
  ignoreRowOrder: false,
  normalizeAddresses: true,
  normalizePhoneNumbers: true,
  numericTolerance: 0.01,
  trimWhitespace: true,
} as const

/** 송장 변환 결과 비교용 옵션 */
export const FLEXIBLE_COMPARE_OPTIONS_INVOICE = {
  coreColumns: [...CORE_COLUMNS_INVOICE],
  dateOnly: false,
  headerRow: 1,
  ignoreEmptyCells: true,
  ignoreRowOrder: true,
  keyColumn: '사방넷주문번호',
  trimWhitespace: true,
} as const

// ============================================================================
// 테스트 헬퍼 함수
// ============================================================================

/** 쇼핑몰명으로 테스트 케이스 찾기 */
export function findShoppingMallTestCase(mallName: string) {
  return SHOPPING_MALL_TEST_CASES.find((tc) => tc.mallName === mallName)
}

/** 제조사명으로 테스트 케이스 찾기 */
export function findTestCase(manufacturer: string): ManufacturerTestCase | undefined {
  return SABANGNET_TEST_CASES.find((tc) => tc.manufacturer === manufacturer)
}

/** 전체 테스트 케이스 (Golden File + Count Only) */
export function getAllManufacturerTestCases() {
  return [
    ...SABANGNET_TEST_CASES,
    ...COUNT_ONLY_TEST_CASES.map((tc) => ({
      ...tc,
      expectedFile: '',
    })),
  ]
}
