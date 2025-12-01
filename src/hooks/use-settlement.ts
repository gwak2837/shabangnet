'use client'

import { useQuery } from '@tanstack/react-query'

import type { SettlementData, SettlementFilters } from '@/lib/api/settlement'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

export function useSettlement(filters: SettlementFilters | null) {
  return useQuery<SettlementData>({
    queryKey: queryKeys.settlement.data({
      manufacturerId: filters?.manufacturerId || '',
      periodType: filters?.periodType || 'month',
      month: filters?.month,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    }),
    queryFn: () => {
      if (!filters?.manufacturerId) {
        return Promise.resolve({
          orders: [],
          summary: {
            totalOrders: 0,
            totalQuantity: 0,
            totalCost: 0,
            totalShippingCost: 0,
            excludedOrderCount: 0,
            manufacturerName: '',
            period: '',
          },
        })
      }
      return api.settlement.getSettlementData(filters)
    },
    enabled: !!filters?.manufacturerId,
  })
}
