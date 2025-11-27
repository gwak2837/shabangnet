import { sendLogs as mockSendLogs, type SendLog } from '@/lib/mock-data'

// 메모리에 데이터 복사
const logsData = [...mockSendLogs]

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface LogFilters {
  endDate?: string
  manufacturerId?: string
  startDate?: string
  status?: 'failed' | 'pending' | 'success'
}

export async function getAll(): Promise<SendLog[]> {
  await delay(300)
  return logsData
}

export async function getById(id: string): Promise<SendLog | undefined> {
  await delay(200)
  return logsData.find((log) => log.id === id)
}

export async function getFiltered(filters: LogFilters): Promise<SendLog[]> {
  await delay(300)

  return logsData.filter((log) => {
    if (filters.manufacturerId && filters.manufacturerId !== 'all' && log.manufacturerId !== filters.manufacturerId) {
      return false
    }
    if (filters.status && filters.status !== ('all' as string) && log.status !== filters.status) {
      return false
    }
    // 날짜 필터링은 필요시 추가
    return true
  })
}
