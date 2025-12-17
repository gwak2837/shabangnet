export const queryKeys = {
  invoiceTemplates: {
    /** 송장 양식 템플릿 전체(부분 무효화용) */
    all: ['invoiceTemplate'] as const,
    /** 제조사별 송장 양식 템플릿 */
    manufacturer: (manufacturerId: number) => ['invoiceTemplate', manufacturerId] as const,
  },
  orderTemplates: {
    common: ['order-templates', 'common'] as const,
    /** 제조사별 발주서 템플릿(제조사 관리 화면) */
    manufacturer: (manufacturerId: number) => ['orderTemplate', manufacturerId] as const,
    /** 제조사별 발주서 템플릿 파일 분석 결과(제조사 관리 > 수정 모달) */
    manufacturerAnalysis: (manufacturerId: number) => ['orderTemplate', manufacturerId, 'analysis'] as const,
    /** 제조사별 발주서 템플릿 전체(부분 무효화용) */
    manufacturerAll: ['orderTemplate'] as const,
    /** 공통 템플릿 파일 분석 결과(설정 > 발주 설정) */
    commonAnalysis: (templateFileName: string) => ['common-order-template-analysis', templateFileName] as const,
    /** 공통 템플릿 테스트 다운로드 후보 제조사 목록 */
    commonTestCandidates: ['common-template-test-candidates'] as const,
  },
  manufacturers: {
    all: ['manufacturers'] as const,
    detail: (id: number) => ['manufacturers', id] as const,
  },
  products: {
    all: ['products'] as const,
    detail: (id: number) => ['products', id] as const,
  },
  orders: {
    /** 주문 관련 전체(부분 무효화용) */
    all: ['orders'] as const,
    batches: ['orders', 'batches'] as const,
    batchesList: (filters: {
      dateFrom?: string
      dateTo?: string
      manufacturerId?: number
      search?: string
      status?: string
    }) => ['orders', 'batches', filters] as const,
    excluded: ['orders', 'excluded'] as const,
    matching: ['orders', 'matching'] as const,
    manufacturers: ['orders', 'manufacturers'] as const,
    summary: (filters: {
      dateFrom?: string
      dateTo?: string
      manufacturerId?: number
      search?: string
      status?: string
    }) => ['orders', 'summary', filters] as const,
  },
  uploads: {
    /** 업로드 관련 전체(부분 무효화용) */
    root: ['uploads'] as const,
    all: ['uploads', 'history'] as const,
    history: (filters: {
      fileType?: string
      startDate?: string
      endDate?: string
      sortBy?: string
      sortOrder?: string
    }) => ['uploads', 'history', filters] as const,
  },
  logs: {
    all: ['logs'] as const,
    detail: (id: number) => ['logs', id] as const,
    list: (filters?: {
      endDate?: string
      manufacturerId?: number
      startDate?: string
      status?: string
    }) => (filters ? (['logs', filters] as const) : (['logs'] as const)),
  },
  optionMappings: {
    all: ['option-mappings'] as const,
  },
  dashboard: {
    /** 대시보드 전체(부분 무효화용) */
    all: ['dashboard'] as const,
    stats: ['dashboard', 'stats'] as const,
    recentUploads: ['dashboard', 'recent-uploads'] as const,
    chartData: ['dashboard', 'chart-data'] as const,
  },
  settings: {
    smtp: ['settings', 'smtp'] as const,
    smtpByPurpose: (purpose: string) => ['settings', 'smtp', purpose] as const,
    exclusion: ['settings', 'exclusion'] as const,
    duplicateCheck: ['settings', 'duplicate-check'] as const,
    courier: ['settings', 'courier'] as const,
    mfa: ['settings', 'mfa'] as const,
    emailTemplate: ['settings', 'email-template'] as const,
  },
  settlement: {
    /** 정산 전체(부분 무효화용) */
    all: ['settlement'] as const,
    data: (filters: {
      manufacturerId: number
      periodType: string
      month?: string
      startDate?: string
      endDate?: string
    }) => ['settlement', filters] as const,
  },
  shoppingMallTemplates: {
    all: ['shopping-mall-templates'] as const,
    detail: (id: number) => ['shopping-mall-templates', id] as const,
  },
  users: {
    all: ['users'] as const,
    list: (params: { status?: string; page?: number; limit?: number }) => ['users', 'list', params] as const,
  },
} as const
