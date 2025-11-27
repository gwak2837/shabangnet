'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api, type SendOrdersParams } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { DuplicateCheckPeriod } from '@/lib/mock-data'

export function useOrderBatches() {
  return useQuery({
    queryKey: queryKeys.orders.batches,
    queryFn: api.orders.getBatches,
  })
}

export function useExcludedOrderBatches() {
  return useQuery({
    queryKey: queryKeys.orders.excluded,
    queryFn: api.orders.getExcludedBatches,
  })
}

export function useSendOrders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: SendOrdersParams) => api.orders.sendOrders(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.batches })
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all })
    },
  })
}

export function useCheckDuplicate() {
  return useMutation({
    mutationFn: ({
      manufacturerId,
      recipientAddresses,
      periodDays,
    }: {
      manufacturerId: string
      recipientAddresses: string[]
      periodDays?: DuplicateCheckPeriod
    }) => api.orders.checkDuplicate(manufacturerId, recipientAddresses, periodDays),
  })
}
