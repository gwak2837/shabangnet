import {
  orderBatches as mockOrderBatches,
  excludedOrderBatches as mockExcludedOrderBatches,
  type OrderBatch,
  type Order,
  checkDuplicateSend,
  type DuplicateCheckResult,
  type DuplicateCheckPeriod,
} from '@/lib/mock-data'

// 메모리에 데이터 복사
let orderBatchesData = [...mockOrderBatches]
let excludedOrderBatchesData = [...mockExcludedOrderBatches]

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export async function getBatches(): Promise<OrderBatch[]> {
  await delay(300)
  return orderBatchesData
}

export async function getExcludedBatches(): Promise<OrderBatch[]> {
  await delay(300)
  return excludedOrderBatchesData
}

export interface SendOrdersParams {
  manufacturerId: string
  orderIds: string[]
  duplicateReason?: string
}

export interface SendOrdersResult {
  success: boolean
  sentCount: number
  errorMessage?: string
}

export async function sendOrders(params: SendOrdersParams): Promise<SendOrdersResult> {
  await delay(1000)

  const batchIndex = orderBatchesData.findIndex((b) => b.manufacturerId === params.manufacturerId)
  if (batchIndex === -1) {
    return { success: false, sentCount: 0, errorMessage: 'Batch not found' }
  }

  // 상태 업데이트 시뮬레이션
  orderBatchesData[batchIndex] = {
    ...orderBatchesData[batchIndex],
    status: 'sent',
    lastSentAt: new Date().toISOString(),
  }

  return { success: true, sentCount: params.orderIds.length }
}

export async function checkDuplicate(
  manufacturerId: string,
  recipientAddresses: string[],
  periodDays?: DuplicateCheckPeriod,
): Promise<DuplicateCheckResult> {
  await delay(200)
  return checkDuplicateSend(manufacturerId, recipientAddresses, periodDays)
}
