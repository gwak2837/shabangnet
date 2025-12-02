'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getBatches, getExcludedBatches } from '@/services/orders'

export function useExcludedOrderBatches() {
  return useQuery({
    queryKey: queryKeys.orders.excluded,
    queryFn: getExcludedBatches,
  })
}

export function useOrderBatches() {
  return useQuery({
    queryKey: queryKeys.orders.batches,
    queryFn: getBatches,
  })
}
