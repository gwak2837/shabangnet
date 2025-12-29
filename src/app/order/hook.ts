'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

export interface OrderBatch {
  emails: string[]
  lastSentAt?: string
  manufacturerId: number
  manufacturerName: string
  orders: Order[]
  status: 'error' | 'pending' | 'ready' | 'sent'
  totalAmount: number
  totalOrders: number
}

export interface OrderBatchSummary {
  errorBatches: number
  pendingBatchesCount: number
  sentBatches: number
  totalBatches: number
  totalOrders: number
}

export interface OrderFilters {
  dateFrom?: string
  dateTo?: string
  manufacturerId?: number
  search?: string
  status?: 'all' | 'error' | 'pending' | 'sent'
}

interface ManufacturerOption {
  id: number
  name: string
}

interface Order {
  address: string
  createdAt: string
  customerName: string
  fulfillmentType?: string
  id: number
  manufacturerId: number
  manufacturerName: string
  optionName: string
  orderName?: string
  phone: string
  price: number
  productCode: string
  productName: string
  quantity: number
  sabangnetOrderNumber: string
  status: 'completed' | 'error' | 'pending' | 'processing'
}

interface OrderBatchesResponse {
  items: OrderBatch[]
  nextCursor: string | null
}

interface UseOrderBatchesParams {
  filters?: OrderFilters
  limit?: number
}

interface UseOrderBatchSummaryParams {
  filters?: OrderFilters
}

export function useManufacturerOptions() {
  return useQuery({
    queryKey: queryKeys.orders.manufacturers,
    queryFn: async (): Promise<ManufacturerOption[]> => {
      const response = await fetch('/api/orders/manufacturers')
      if (!response.ok) {
        throw new Error('Failed to fetch manufacturers')
      }
      return response.json()
    },
  })
}

export function useOrderBatches(params: UseOrderBatchesParams = {}) {
  const { limit = 20, filters } = params
  const { search, manufacturerId, status, dateFrom, dateTo } = filters ?? {}

  return useInfiniteQuery({
    queryKey: queryKeys.orders.batchesList({ search, manufacturerId, status, dateFrom, dateTo }),
    queryFn: async ({ pageParam }): Promise<OrderBatchesResponse> => {
      const searchParams = new URLSearchParams()

      if (pageParam) {
        searchParams.set('cursor', String(pageParam))
      }
      searchParams.set('limit', String(limit))
      if (search) {
        searchParams.set('search', search)
      }
      if (manufacturerId) {
        searchParams.set('manufacturer-id', String(manufacturerId))
      }
      if (status && status !== 'all') {
        searchParams.set('status', status)
      }
      if (dateFrom) {
        searchParams.set('date-from', dateFrom)
      }
      if (dateTo) {
        searchParams.set('date-to', dateTo)
      }

      const response = await fetch(`/api/orders?${searchParams.toString()}`, { cache: 'no-store' })

      if (!response.ok) {
        throw new Error('Failed to fetch order batches')
      }

      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  })
}

export function useOrderBatchSummary(params: UseOrderBatchSummaryParams = {}) {
  const { filters } = params
  const { search, manufacturerId, status, dateFrom, dateTo } = filters ?? {}

  return useQuery({
    queryKey: queryKeys.orders.summary({ search, manufacturerId, status, dateFrom, dateTo }),
    queryFn: async (): Promise<OrderBatchSummary> => {
      const searchParams = new URLSearchParams()
      if (search) {
        searchParams.set('search', search)
      }
      if (manufacturerId) {
        searchParams.set('manufacturer-id', String(manufacturerId))
      }
      if (status && status !== 'all') {
        searchParams.set('status', status)
      }
      if (dateFrom) {
        searchParams.set('date-from', dateFrom)
      }
      if (dateTo) {
        searchParams.set('date-to', dateTo)
      }

      const response = await fetch(`/api/orders/summary?${searchParams.toString()}`, { cache: 'no-store' })

      if (!response.ok) {
        const { error } = (await response.json()) as { error?: string }
        throw new Error(error || '통계를 불러오지 못했어요')
      }

      return response.json()
    },
  })
}
