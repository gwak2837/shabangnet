import {
  type DashboardStats,
  manufacturerChartData as mockChartData,
  dashboardStats as mockStats,
  recentUploads as mockUploads,
  type Upload,
} from '@/lib/mock-data'

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface ChartDataItem {
  amount: number
  name: string
  orders: number
}

export async function getChartData(): Promise<ChartDataItem[]> {
  await delay(300)
  return mockChartData
}

export async function getRecentUploads(): Promise<Upload[]> {
  await delay(300)
  return mockUploads
}

export async function getStats(): Promise<DashboardStats> {
  await delay(300)
  return mockStats
}
