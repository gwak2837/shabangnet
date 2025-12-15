'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

export interface UploadHistoryFilters {
  endDate?: string
  fileType?: 'sabangnet' | 'shopping_mall'
  sortBy?: 'errorOrders' | 'fileName' | 'processedOrders' | 'totalOrders' | 'uploadedAt'
  sortOrder?: 'asc' | 'desc'
  startDate?: string
}

export interface UploadHistoryItem {
  currentOrderCount: number
  errorOrders: number
  fileName: string
  fileSize: number
  fileType: 'sabangnet' | 'shopping_mall'
  id: number
  processedOrders: number
  shoppingMallId: number | null
  shoppingMallName: string | null
  status: string
  totalOrders: number
  uploadedAt: string
}

interface UploadHistoryResponse {
  hasMore: boolean
  items: UploadHistoryItem[]
  nextCursor: string | null
}

interface UseUploadHistoryParams {
  filters?: UploadHistoryFilters
  initialData?: UploadHistoryResponse
  limit?: number
}

export function useUploadHistory(params: UseUploadHistoryParams = {}) {
  const { limit = 20, filters, initialData } = params
  const { fileType, startDate, endDate, sortBy = 'uploadedAt', sortOrder = 'desc' } = filters ?? {}

  return useInfiniteQuery({
    queryKey: queryKeys.uploads.history({ fileType, startDate, endDate, sortBy, sortOrder }),
    queryFn: async ({ pageParam }): Promise<UploadHistoryResponse> => {
      const searchParams = new URLSearchParams()

      if (pageParam) {
        searchParams.set('cursor', pageParam)
      }
      searchParams.set('limit', String(limit))
      if (fileType) {
        searchParams.set('file-type', fileType)
      }
      if (startDate) {
        searchParams.set('start-date', startDate)
      }
      if (endDate) {
        searchParams.set('end-date', endDate)
      }
      if (sortBy) {
        searchParams.set('sort-by', sortBy)
      }
      if (sortOrder) {
        searchParams.set('sort-order', sortOrder)
      }

      const response = await fetch(`/api/upload/history?${searchParams.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch upload history')
      }

      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    initialData: initialData ? { pages: [initialData], pageParams: [null] } : undefined,
  })
}
