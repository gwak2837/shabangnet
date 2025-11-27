import {
  dashboardStats as mockStats,
  recentUploads as mockUploads,
  manufacturerChartData as mockChartData,
  type DashboardStats,
  type Upload,
} from '@/lib/mock-data'

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getStats(): Promise<DashboardStats> {
  await delay(300)
  return mockStats
}

export async function getRecentUploads(): Promise<Upload[]> {
  await delay(300)
  return mockUploads
}

export interface ChartDataItem {
  name: string
  orders: number
  amount: number
}

export async function getChartData(): Promise<ChartDataItem[]> {
  await delay(300)
  return mockChartData
}
