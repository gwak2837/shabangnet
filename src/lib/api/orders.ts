import {
  checkDuplicateSend,
  type DuplicateCheckPeriod,
  type DuplicateCheckResult,
  excludedOrderBatches as mockExcludedOrderBatches,
  orderBatches as mockOrderBatches,
  type OrderBatch,
} from '@/lib/mock-data'
import {
  getExcludedOrderBatches,
  getOrderBatches,
  hasUploadedOrders,
  type OrderBatch as RealOrderBatch,
  updateBatchStatus,
} from '@/lib/stores/order-store'

// 메모리에 데이터 복사
const orderBatchesData = [...mockOrderBatches]
const excludedOrderBatchesData = [...mockExcludedOrderBatches]

// API 지연 시뮬레이션
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface SendOrdersParams {
  duplicateReason?: string
  manufacturerId: string
  orderIds: string[]
}

export interface SendOrdersResult {
  errorMessage?: string
  sentCount: number
  success: boolean
}

export async function checkDuplicate(
  manufacturerId: string,
  recipientAddresses: string[],
  periodDays?: DuplicateCheckPeriod,
): Promise<DuplicateCheckResult> {
  await delay(200)
  return checkDuplicateSend(manufacturerId, recipientAddresses, periodDays)
}

export async function getBatches(): Promise<OrderBatch[]> {
  await delay(300)

  // 업로드된 주문이 있으면 그것을 사용
  if (hasUploadedOrders()) {
    const realBatches = getOrderBatches()
    return realBatches.map(convertToMockFormat)
  }

  // 없으면 mock 데이터 사용
  return orderBatchesData
}

export async function getExcludedBatches(): Promise<OrderBatch[]> {
  await delay(300)

  // 업로드된 주문이 있으면 그것을 사용
  if (hasUploadedOrders()) {
    const realBatches = getExcludedOrderBatches()
    return realBatches.map(convertToMockFormat)
  }

  // 없으면 mock 데이터 사용
  return excludedOrderBatchesData
}

export async function sendOrders(params: SendOrdersParams): Promise<SendOrdersResult> {
  await delay(1000)

  // 업로드된 주문이 있으면 real store 업데이트
  if (hasUploadedOrders()) {
    updateBatchStatus(params.manufacturerId, 'sent', new Date().toISOString())
    return { success: true, sentCount: params.orderIds.length }
  }

  // Mock 데이터 업데이트
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

// RealOrderBatch를 OrderBatch로 변환
function convertToMockFormat(batch: RealOrderBatch): OrderBatch {
  return {
    manufacturerId: batch.manufacturerId,
    manufacturerName: batch.manufacturerName,
    orders: batch.orders.map((o) => ({
      id: `order_${o.rowIndex}`,
      orderNumber: o.orderNumber,
      customerName: o.recipientName,
      phone: o.recipientMobile || o.recipientPhone,
      address: o.address,
      productCode: o.productCode,
      productName: o.productName,
      optionName: o.optionName,
      quantity: o.quantity,
      price: o.paymentAmount,
      manufacturerId: batch.manufacturerId,
      manufacturerName: batch.manufacturerName,
      status: 'pending' as const,
      createdAt: new Date().toISOString(),
      fulfillmentType: o.shoppingMall,
    })),
    totalOrders: batch.totalOrders,
    totalAmount: batch.totalAmount,
    status: batch.status,
    email: batch.email || '',
    lastSentAt: batch.lastSentAt,
  }
}
