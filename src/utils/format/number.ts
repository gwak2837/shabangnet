export type OrderStatus = 'completed' | 'error' | 'pending' | 'processing' | 'ready' | 'sent'

/**
 * 한국어 숫자 단위로 축약 표시 (만, 억, 조)
 * 3~4자리 유효숫자로 가독성 있게 표시
 *
 * @example
 * formatCompactNumber(1234) // "1,234"
 * formatCompactNumber(12345) // "1.23만"
 * formatCompactNumber(123456789) // "1.23억"
 * formatCompactNumber(1234567890123) // "1.23조"
 */
export function formatCompactNumber(value: number): string {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  // 1조 이상
  if (absValue >= 1_000_000_000_000) {
    const num = absValue / 1_000_000_000_000
    return sign + formatWithPrecision(num) + '조'
  }

  // 1억 이상
  if (absValue >= 100_000_000) {
    const num = absValue / 100_000_000
    return sign + formatWithPrecision(num) + '억'
  }

  // 1만 이상
  if (absValue >= 10_000) {
    const num = absValue / 10_000
    return sign + formatWithPrecision(num) + '만'
  }

  // 1만 미만
  return sign + absValue.toLocaleString('ko-KR')
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export function formatProductNameWithOption(productName: string, optionName?: string): string {
  if (!optionName || optionName.trim() === '') {
    return productName
  }
  return `${productName} (${optionName})`
}

export function formatRecipientName(customerName: string, orderName?: string): string {
  if (!orderName || orderName === customerName) {
    return customerName
  }
  return `${customerName} (주문: ${orderName})`
}

export function getDaysDifference(dateString: string): number {
  const sentDate = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - sentDate.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    processing: 'bg-blue-100 text-blue-800',
    ready: 'bg-emerald-100 text-emerald-800',
    completed: 'bg-emerald-100 text-emerald-800',
    sent: 'bg-emerald-100 text-emerald-800',
    error: 'bg-rose-100 text-rose-800',
  }
  return colors[status] || colors.pending
}

export function getStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: '대기중',
    processing: '처리중',
    ready: '발송대기',
    completed: '완료',
    sent: '발송완료',
    error: '오류',
  }
  return labels[status] || status
}

/**
 * 3~4자리 유효숫자로 포맷
 * - 100 이상: 정수 (1,234)
 * - 10 이상: 소수점 1자리 (12.3)
 * - 10 미만: 소수점 2자리 (1.23)
 */
function formatWithPrecision(num: number): string {
  if (num >= 100) {
    return Math.round(num).toLocaleString('ko-KR')
  }
  if (num >= 10) {
    return num.toFixed(1).replace(/\.0$/, '')
  }
  return num.toFixed(2).replace(/\.?0+$/, '')
}

// Exclusion label map - should be synced with backend exclusion patterns
const EXCLUSION_LABELS: Record<string, string> = {
  'f-농협-': '농협 배송',
  'f-자사-': '자사 배송',
  'f-새벽-': '새벽 배송',
  'f-직접-': '직접 배송',
}

export function getExclusionLabelSync(fulfillmentType?: string): string | null {
  if (!fulfillmentType) return null

  for (const [pattern, label] of Object.entries(EXCLUSION_LABELS)) {
    if (fulfillmentType.includes(pattern.replace(/^f-|-$/g, ''))) {
      return label
    }
  }
  return null
}
