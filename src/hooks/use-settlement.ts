'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import type { SettlementFilters, SettlementListResponse } from '@/app/settlement/settlement.types'

import { queryKeys } from '@/common/constants/query-keys'

export function useSettlement(filters: SettlementFilters | null, params: { limit?: number } = {}) {
  const { limit = 50 } = params

  return useInfiniteQuery({
    queryKey: queryKeys.settlement.list({
      limit,
      manufacturerId: filters?.manufacturerId || 0,
      periodType: filters?.periodType || 'month',
      month: filters?.month,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    }),
    queryFn: async ({ pageParam }): Promise<SettlementListResponse> => {
      if (!filters?.manufacturerId) {
        return { items: [], nextCursor: null }
      }

      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      if (pageParam) {
        searchParams.set('cursor', pageParam)
      }
      searchParams.set('manufacturer-id', String(filters.manufacturerId))
      searchParams.set('period-type', filters.periodType)

      if (filters.periodType === 'month' && filters.month) {
        searchParams.set('month', filters.month)
      }
      if (filters.periodType === 'range') {
        if (filters.startDate) {
          searchParams.set('start-date', filters.startDate)
        }
        if (filters.endDate) {
          searchParams.set('end-date', filters.endDate)
        }
      }

      const response = await fetch(`/api/settlement?${searchParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('로그인이 필요해요')
        }
        throw new Error(`정산 내역을 불러오지 못했어요. (${response.status})`)
      }
      return (await response.json()) as SettlementListResponse
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
    enabled: !!filters?.manufacturerId,
  })
}
