'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getSettlementData, type SettlementData, type SettlementFilters } from '@/services/settlement'

export function useSettlement(filters: SettlementFilters | null) {
  return useQuery<SettlementData>({
    queryKey: queryKeys.settlement.data({
      manufacturerId: filters?.manufacturerId || 0,
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
      return getSettlementData(filters)
    },
    enabled: !!filters?.manufacturerId,
  })
}
