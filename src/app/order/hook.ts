'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getExcludedBatches } from '@/services/orders'

// ============================================
// Types
// ============================================

export interface OrderBatch {
  email: string
  lastSentAt?: string
  manufacturerId: number
  manufacturerName: string
  orders: Order[]
  status: 'error' | 'pending' | 'ready' | 'sent'
  totalAmount: number
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
  nextCursor: number | null
}

interface UseOrderBatchesParams {
  filters?: OrderFilters
  limit?: number
}

// ============================================
// Hooks
// ============================================

export function useExcludedOrderBatches() {
  return useQuery({
    queryKey: queryKeys.orders.excluded,
    queryFn: getExcludedBatches,
  })
}

export function useManufacturerOptions() {
  return useQuery({
    queryKey: ['orders', 'manufacturers'],
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
  const { limit = 2, filters } = params
  const { search, manufacturerId, status, dateFrom, dateTo } = filters ?? {}

  return useInfiniteQuery({
    queryKey: ['orders', 'batches', { search, manufacturerId, status, dateFrom, dateTo }],
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

      const response = await fetch(`/api/orders?${searchParams.toString()}`)

      if (!response.ok) {
        throw new Error('Failed to fetch order batches')
      }

      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as number | null,
  })
}
