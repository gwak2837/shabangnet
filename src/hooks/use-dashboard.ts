'use client'

import { useQuery } from '@tanstack/react-query'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: api.dashboard.getStats,
  })
}

export function useManufacturerChartData() {
  return useQuery({
    queryKey: queryKeys.dashboard.chartData,
    queryFn: api.dashboard.getChartData,
  })
}

export function useRecentUploads() {
  return useQuery({
    queryKey: queryKeys.dashboard.recentUploads,
    queryFn: api.dashboard.getRecentUploads,
  })
}
