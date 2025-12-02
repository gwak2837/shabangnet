'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import {
  checkDuplicate,
  type DuplicateCheckPeriod,
  getBatches,
  getExcludedBatches,
  sendOrders,
  type SendOrdersParams,
} from '@/services/orders'

export function useCheckDuplicate() {
  return useMutation({
    mutationFn: ({
      manufacturerId,
      recipientAddresses,
      periodDays,
    }: {
      manufacturerId: string
      periodDays?: DuplicateCheckPeriod
      recipientAddresses: string[]
    }) => checkDuplicate(manufacturerId, recipientAddresses, periodDays),
  })
}

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

export function useSendOrders() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: SendOrdersParams) => sendOrders(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.batches })
      queryClient.invalidateQueries({ queryKey: queryKeys.logs.all })
    },
  })
}
