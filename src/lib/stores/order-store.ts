// 메모리 기반 주문 저장소
// 실제 구현 시 DB를 사용하면 이 파일은 제거됨

import { type ParsedOrder } from '@/lib/excel'

export interface OrderBatch {
  manufacturerId: string
  manufacturerName: string
  orders: ParsedOrder[]
  totalOrders: number
  totalAmount: number
  status: 'pending' | 'ready' | 'sent' | 'error'
  email?: string
  lastSentAt?: string
}

// 전역 저장소
let uploadedOrders: ParsedOrder[] = []
let orderBatches: OrderBatch[] = []
let excludedOrderBatches: OrderBatch[] = []

// 발송 제외 패턴 (임시)
const exclusionPatterns = [
  '[30002002]주문_센터택배',
  '[30002002]주문_직택배',
  '현대홈직택배[제휴몰]현대이지웰',
  '현대홈직택배',
]

function shouldExclude(order: ParsedOrder): boolean {
  const shoppingMall = order.shoppingMall || ''
  return exclusionPatterns.some((pattern) => shoppingMall.includes(pattern))
}

// 주문 저장 (업로드 시 호출)
export function setUploadedOrders(orders: ParsedOrder[]): void {
  uploadedOrders = orders

  // 제조사별로 그룹화
  const groupedByManufacturer = new Map<string, ParsedOrder[]>()
  const excludedByManufacturer = new Map<string, ParsedOrder[]>()

  orders.forEach((order) => {
    const manufacturer = order.manufacturer || '미지정'

    if (shouldExclude(order)) {
      const existing = excludedByManufacturer.get(manufacturer) || []
      existing.push(order)
      excludedByManufacturer.set(manufacturer, existing)
    } else {
      const existing = groupedByManufacturer.get(manufacturer) || []
      existing.push(order)
      groupedByManufacturer.set(manufacturer, existing)
    }
  })

  // 배치 생성
  orderBatches = Array.from(groupedByManufacturer.entries()).map(([name, orders]) => ({
    manufacturerId: name.replace(/\s/g, '_').toLowerCase(),
    manufacturerName: name,
    orders,
    totalOrders: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + (o.paymentAmount || 0) * o.quantity, 0),
    status: 'pending',
  }))

  excludedOrderBatches = Array.from(excludedByManufacturer.entries()).map(([name, orders]) => ({
    manufacturerId: name.replace(/\s/g, '_').toLowerCase(),
    manufacturerName: name,
    orders,
    totalOrders: orders.length,
    totalAmount: orders.reduce((sum, o) => sum + (o.paymentAmount || 0) * o.quantity, 0),
    status: 'pending',
  }))
}

// 주문 조회
export function getUploadedOrders(): ParsedOrder[] {
  return uploadedOrders
}

// 배치 조회
export function getOrderBatches(): OrderBatch[] {
  return orderBatches
}

// 제외 배치 조회
export function getExcludedOrderBatches(): OrderBatch[] {
  return excludedOrderBatches
}

// 배치 상태 업데이트
export function updateBatchStatus(
  manufacturerId: string,
  status: 'pending' | 'ready' | 'sent' | 'error',
  sentAt?: string,
): void {
  const batchIndex = orderBatches.findIndex((b) => b.manufacturerId === manufacturerId)
  if (batchIndex !== -1) {
    orderBatches[batchIndex] = {
      ...orderBatches[batchIndex],
      status,
      lastSentAt: sentAt,
    }
  }
}

// 초기화
export function clearOrders(): void {
  uploadedOrders = []
  orderBatches = []
  excludedOrderBatches = []
}

// 업로드된 주문이 있는지 확인
export function hasUploadedOrders(): boolean {
  return uploadedOrders.length > 0
}
