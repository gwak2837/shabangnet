'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getById, type LogFilters, type SendLog } from '@/services/logs'

interface LogListResponse {
  items: SendLog[]
  nextCursor: string | null
  summary: {
    failedLogs: number
    successLogs: number
    totalLogs: number
  }
}

interface UseSendLogsParams {
  filters?: LogFilters
  limit?: number
}

export function useSendLog(id: number) {
  return useQuery({
    queryKey: queryKeys.logs.detail(id),
    queryFn: () => getById(id),
    enabled: !!id,
  })
}

export function useSendLogs(params: UseSendLogsParams = {}) {
  const { filters, limit = 50 } = params
  const { manufacturerId, status, startDate, endDate } = filters ?? {}

  return useInfiniteQuery({
    queryKey: queryKeys.logs.list({ manufacturerId, status, startDate, endDate, limit }),
    queryFn: async ({ pageParam }): Promise<LogListResponse> => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      if (pageParam) {
        searchParams.set('cursor', pageParam)
      }
      if (manufacturerId) {
        searchParams.set('manufacturer-id', String(manufacturerId))
      }
      if (status && status !== 'all') {
        searchParams.set('status', status)
      }
      if (startDate) {
        searchParams.set('start-date', startDate)
      }
      if (endDate) {
        searchParams.set('end-date', endDate)
      }

      const response = await fetch(`/api/logs?${searchParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch logs')
      }
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  })
}
