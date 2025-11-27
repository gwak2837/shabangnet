'use client'

import { useQuery } from '@tanstack/react-query'
import { api, type LogFilters } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

export function useSendLogs(filters?: LogFilters) {
  return useQuery({
    queryKey: [...queryKeys.logs.all, filters],
    queryFn: () => (filters ? api.logs.getFiltered(filters) : api.logs.getAll()),
  })
}

export function useSendLog(id: string) {
  return useQuery({
    queryKey: queryKeys.logs.detail(id),
    queryFn: () => api.logs.getById(id),
    enabled: !!id,
  })
}

