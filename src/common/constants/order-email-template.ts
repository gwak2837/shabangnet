export const ORDER_EMAIL_TEMPLATE_SLUG = 'order-default' as const

export const ORDER_EMAIL_TEMPLATE_VARIABLES = {
  manufacturerName: '제조사명',
  senderName: '발신자명',
  senderEmail: '발신자 이메일',
  toEmail: '수신자 이메일',
  ccEmail: '참조(CC) 이메일',
  orderDate: '발주일자(표시용)',
  sentAt: '발송 시각(ISO)',
  fileName: '첨부파일명(xlsx)',
  orderCount: '총 주문 건수',
  totalAmount: '총 결제금액(원, 숫자)',
  totalAmountFormatted: '총 결제금액(표시용)',
  recipientAddressCount: '수취인 주소 수(중복 제거)',
  mode: '발송 모드(send|resend)',
  reason: '재발송/중복 발송 사유(선택)',
  orders: '주문 목록(배열) - {{#each orders}}...{{/each}} (상품명/옵션/수량/금액/수취인/주소/메모/쇼핑몰 등)',
} as const satisfies Record<string, string>

export interface OrderEmailTemplateOrderItem {
  address: string | null
  cost: number
  courier: string | null
  mallOrderNumber: string | null
  memo: string | null
  optionName: string | null
  paymentAmount: number
  paymentAmountFormatted: string
  postalCode: string | null
  productName: string
  quantity: number
  recipientMobile: string | null
  recipientName: string
  recipientPhone: string | null
  sabangnetOrderNumber: string
  shippingCost: number
  shoppingMall: string | null
  trackingNumber: string | null
}

export interface OrderEmailTemplateVariables {
  ccEmail: string | null
  fileName: string
  manufacturerName: string
  mode: 'resend' | 'send'
  orderCount: number
  orderDate: string
  orders: OrderEmailTemplateOrderItem[]
  reason: string | null
  recipientAddressCount: number
  senderEmail: string
  senderName: string
  sentAt: string
  toEmail: string
  totalAmount: number
  totalAmountFormatted: string
}

export function getSampleOrderEmailTemplateVariables(): OrderEmailTemplateVariables {
  const now = new Date()
  const totalAmount = 123_400
  const totalAmountFormatted = `${new Intl.NumberFormat('ko-KR').format(totalAmount)}원`

  return {
    manufacturerName: '(주)테스트제조사',
    senderName: '(주)다온에프앤씨',
    senderEmail: 'sender@example.com',
    toEmail: 'manufacturer@example.com',
    ccEmail: 'cc@example.com',
    orderDate: now.toLocaleDateString('ko-KR'),
    sentAt: now.toISOString(),
    fileName: '발주서_20251218.xlsx',
    orderCount: 2,
    totalAmount,
    totalAmountFormatted,
    recipientAddressCount: 2,
    mode: 'send',
    reason: '빠른 배송 부탁드려요',
    orders: [
      {
        sabangnetOrderNumber: 'SBN-0001',
        mallOrderNumber: 'MALL-0001',
        productName: '테스트 상품 1',
        optionName: '옵션 A',
        quantity: 2,
        paymentAmount: 56_700,
        paymentAmountFormatted: '56,700원',
        cost: 30_000,
        shippingCost: 3_000,
        recipientName: '홍길동',
        recipientPhone: '02-1234-5678',
        recipientMobile: '010-1234-5678',
        postalCode: '12345',
        address: '서울특별시 강남구 테헤란로 1',
        memo: '문 앞에 두고 가주세요',
        shoppingMall: '테스트몰',
        courier: 'CJ대한통운',
        trackingNumber: null,
      },
      {
        sabangnetOrderNumber: 'SBN-0002',
        mallOrderNumber: 'MALL-0002',
        productName: '테스트 상품 2',
        optionName: null,
        quantity: 1,
        paymentAmount: 66_700,
        paymentAmountFormatted: '66,700원',
        cost: 40_000,
        shippingCost: 0,
        recipientName: '김다온',
        recipientPhone: null,
        recipientMobile: '010-9876-5432',
        postalCode: '54321',
        address: '인천광역시 연수구 송도동 2',
        memo: null,
        shoppingMall: '테스트몰',
        courier: 'CJ대한통운',
        trackingNumber: null,
      },
    ],
  }
}
