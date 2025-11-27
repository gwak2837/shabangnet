'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { SettlementFilters } from '@/lib/api/settlement'

export function useSettlement(filters: SettlementFilters | null) {
  return useQuery({
    queryKey: queryKeys.settlement.data({
      manufacturerId: filters?.manufacturerId || '',
      periodType: filters?.periodType || 'month',
      month: filters?.month,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    }),
    queryFn: () => {
      if (!filters?.manufacturerId) {
        return Promise.resolve({ orders: [], summary: { totalOrders: 0, totalQuantity: 0, totalCost: 0, manufacturerName: '', period: '' } })
      }
      return api.settlement.getSettlementData(filters)
    },
    enabled: !!filters?.manufacturerId,
  })
}

