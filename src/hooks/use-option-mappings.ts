'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import type { OptionManufacturerMapping } from '@/services/option-mappings'

import { queryKeys } from '@/common/constants/query-keys'

interface OptionMappingListFilters {
  manufacturerId?: number
  search?: string
  unmapped?: boolean
}

interface OptionMappingListResponse {
  items: OptionManufacturerMapping[]
  nextCursor: string | null
  summary: {
    totalMappings: number
    unmappedMappings: number
    uniqueManufacturers: number
    uniqueProductCodes: number
  }
}

interface UseOptionMappingsParams {
  filters?: OptionMappingListFilters
  limit?: number
}

export function useOptionMappings(params: UseOptionMappingsParams = {}) {
  const { filters, limit = 50 } = params
  const { search, manufacturerId, unmapped } = filters ?? {}

  return useInfiniteQuery({
    queryKey: queryKeys.optionMappings.list({ limit, search, manufacturerId, unmapped }),
    queryFn: async ({ pageParam }): Promise<OptionMappingListResponse> => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      if (pageParam) {
        searchParams.set('cursor', pageParam)
      }
      if (search) {
        searchParams.set('search', search)
      }
      if (manufacturerId) {
        searchParams.set('manufacturer-id', String(manufacturerId))
      }
      if (unmapped) {
        searchParams.set('unmapped', 'true')
      }

      const response = await fetch(`/api/options?${searchParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch option mappings')
      }
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  })
}
