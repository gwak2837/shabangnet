export interface AnalyzeResult {
  detectedHeaderRow: number
  headers: string[]
  previewRows: string[][]
  totalRows: number
}

export interface CreateTemplateData {
  columnMappings: Record<string, string>
  dataStartRow: number
  displayName: string
  headerRow: number
  mallName: string
}

export interface ShoppingMallTemplate {
  columnMappings: Record<string, string>
  createdAt: string
  dataStartRow: number
  displayName: string
  enabled: boolean
  headerRow: number
  id: string
  mallName: string
  updatedAt: string
}

export interface UpdateTemplateData {
  columnMappings?: Record<string, string>
  dataStartRow?: number
  displayName?: string
  enabled?: boolean
  headerRow?: number
  mallName?: string
}

// Mock 데이터 - 기존 SHOPPING_MALL_CONFIGS 기반 (ID 일치)
const INITIAL_MOCK_TEMPLATES: ShoppingMallTemplate[] = [
  {
    id: 'sk-stoa',
    mallName: 'sk_stoa',
    displayName: 'SK스토아',
    headerRow: 3,
    dataStartRow: 4,
    columnMappings: {
      통합주문번호: 'orderNumber',
      상품명: 'productName',
      단품상세: 'optionName',
      수량: 'quantity',
      고객명: 'orderName',
      인수자: 'recipientName',
      우편번호: 'postalCode',
      주소: 'address',
      전화1: 'recipientPhone',
      전화2: 'recipientMobile',
      배송메시지: 'memo',
      '결제금액(부가세포함)': 'paymentAmount',
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'samsung-card',
    mallName: 'samsung_card',
    displayName: '삼성카드몰',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {
      주문번호: 'orderNumber',
      상품명: 'productName',
      단품명: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      수취인: 'recipientName',
      우편번호: 'postalCode',
      주소: 'address',
      휴대폰번호: 'recipientMobile',
      고객배송요청사항: 'memo',
      결제금액: 'paymentAmount',
      상품코드: 'productCode',
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'samsung-welfare',
    mallName: 'samsung_welfare',
    displayName: '삼성복지몰',
    headerRow: 1,
    dataStartRow: 2,
    columnMappings: {
      주문번호: 'orderNumber',
      상품명: 'productName',
      단품명: 'optionName',
      수량: 'quantity',
      주문자: 'orderName',
      수취인: 'recipientName',
      우편번호: 'postalCode',
      주소: 'address',
      휴대폰번호: 'recipientMobile',
      고객배송요청사항: 'memo',
      결제금액: 'paymentAmount',
    },
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// 메모리에 데이터 저장
let mockTemplates = [...INITIAL_MOCK_TEMPLATES]

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// 샘플 파일 분석 (실제 API 호출 - 파일 파싱은 서버에서만 가능)
export async function analyzeShoppingMallFile(file: File, headerRow?: number): Promise<AnalyzeResult> {
  const formData = new FormData()
  formData.append('file', file)
  if (headerRow !== undefined) {
    formData.append('headerRow', String(headerRow))
  }

  const response = await fetch('/api/shopping-mall-templates/analyze', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '파일 분석에 실패했습니다')
  }

  return response.json()
}

// 새 템플릿 생성
export async function createShoppingMallTemplate(data: CreateTemplateData): Promise<ShoppingMallTemplate> {
  await delay(300)

  // 중복 체크
  if (mockTemplates.some((t) => t.mallName === data.mallName)) {
    throw new Error('이미 존재하는 쇼핑몰 ID입니다')
  }

  const newTemplate: ShoppingMallTemplate = {
    id: `mall_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`,
    mallName: data.mallName,
    displayName: data.displayName,
    headerRow: data.headerRow,
    dataStartRow: data.dataStartRow,
    columnMappings: data.columnMappings,
    enabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  mockTemplates = [...mockTemplates, newTemplate]
  return newTemplate
}

// 템플릿 삭제
export async function deleteShoppingMallTemplate(id: string): Promise<void> {
  await delay(300)
  mockTemplates = mockTemplates.filter((t) => t.id !== id)
}

// 템플릿 상세 조회
export async function getShoppingMallTemplate(id: string): Promise<ShoppingMallTemplate> {
  await delay(200)
  const template = mockTemplates.find((t) => t.id === id)
  if (!template) {
    throw new Error('템플릿을 찾을 수 없습니다')
  }
  return template
}

// 템플릿 목록 조회
export async function getShoppingMallTemplates(): Promise<ShoppingMallTemplate[]> {
  await delay(200)
  return mockTemplates
}

// 템플릿 수정
export async function updateShoppingMallTemplate(id: string, data: UpdateTemplateData): Promise<ShoppingMallTemplate> {
  await delay(300)

  const index = mockTemplates.findIndex((t) => t.id === id)
  if (index === -1) {
    throw new Error('템플릿을 찾을 수 없습니다')
  }

  // mallName 중복 체크
  if (data.mallName && data.mallName !== mockTemplates[index].mallName) {
    if (mockTemplates.some((t) => t.mallName === data.mallName)) {
      throw new Error('이미 존재하는 쇼핑몰 ID입니다')
    }
  }

  const updated: ShoppingMallTemplate = {
    ...mockTemplates[index],
    ...data,
    updatedAt: new Date().toISOString(),
  }

  mockTemplates[index] = updated
  return updated
}
