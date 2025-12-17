'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

import { type ExcludedReasonBatch, getExcludedBatches } from './action'

export function useExcludedOrderBatches() {
  return useQuery<ExcludedReasonBatch[]>({
    queryKey: queryKeys.orders.excluded,
    queryFn: getExcludedBatches,
  })
}
