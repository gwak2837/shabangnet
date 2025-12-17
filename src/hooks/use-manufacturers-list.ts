'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import type { Manufacturer } from '@/services/manufacturers.types'

import { queryKeys } from '@/common/constants/query-keys'

interface ManufacturerListResponse {
  items: Manufacturer[]
  nextCursor: string | null
  summary: {
    totalManufacturers: number
    totalOrders: number
  }
}

interface UseManufacturersListParams {
  limit?: number
  search?: string
}

export function useManufacturersList(params: UseManufacturersListParams = {}) {
  const { search, limit = 50 } = params

  return useInfiniteQuery({
    queryKey: queryKeys.manufacturers.list({ limit, search }),
    queryFn: async ({ pageParam }): Promise<ManufacturerListResponse> => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      if (pageParam) {
        searchParams.set('cursor', pageParam)
      }
      if (search) {
        searchParams.set('search', search)
      }

      const response = await fetch(`/api/manufacturers?${searchParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch manufacturers')
      }
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  })
}
