export const queryKeys = {
  manufacturers: {
    all: ['manufacturers'] as const,
    detail: (id: string) => ['manufacturers', id] as const,
  },
  products: {
    all: ['products'] as const,
    detail: (id: string) => ['products', id] as const,
  },
  orders: {
    batches: ['orders', 'batches'] as const,
    excluded: ['orders', 'excluded'] as const,
  },
  logs: {
    all: ['logs'] as const,
    detail: (id: string) => ['logs', id] as const,
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
    exclusion: ['settings', 'exclusion'] as const,
    duplicateCheck: ['settings', 'duplicate-check'] as const,
    courier: ['settings', 'courier'] as const,
  },
} as const

