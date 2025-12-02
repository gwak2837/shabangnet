'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getChartData, getRecentUploads, getStats } from '@/services/dashboard'

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: getStats,
  })
}

export function useManufacturerChartData() {
  return useQuery({
    queryKey: queryKeys.dashboard.chartData,
    queryFn: getChartData,
  })
}

export function useRecentUploads() {
  return useQuery({
    queryKey: queryKeys.dashboard.recentUploads,
    queryFn: getRecentUploads,
  })
}
