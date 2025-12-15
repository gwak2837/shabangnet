export const queryKeys = {
  orderTemplates: {
    common: ['order-templates', 'common'] as const,
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
    batches: ['orders', 'batches'] as const,
    excluded: ['orders', 'excluded'] as const,
    matching: ['orders', 'matching'] as const,
  },
  uploads: {
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
  },
  optionMappings: {
    all: ['option-mappings'] as const,
  },
  dashboard: {
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
