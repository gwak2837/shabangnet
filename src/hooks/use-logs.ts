'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getAll, getById, getFiltered, type LogFilters } from '@/services/logs'

export function useSendLog(id: number) {
  return useQuery({
    queryKey: queryKeys.logs.detail(id),
    queryFn: () => getById(id),
    enabled: !!id,
  })
}

export function useSendLogs(filters?: LogFilters) {
  return useQuery({
    queryKey: queryKeys.logs.list(filters),
    queryFn: () => (filters ? getFiltered(filters) : getAll()),
  })
}
