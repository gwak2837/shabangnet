import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

export async function invalidateCachesAfterUpload(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    // 헤더 통계(StatusIndicator) 포함 대시보드 영역
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),

    // 업로드 기록
    queryClient.invalidateQueries({ queryKey: queryKeys.uploads.root }),

    // 주문 관련 화면(발주 생성/발송, 매칭 요약, 제외 목록, 배치/요약 등)
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),

    // 제조사 관리(업로드 시 제조사가 자동 생성될 수 있어요)
    queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all }),

    // 상품 연결(업로드 시 상품이 자동 생성될 수 있어요)
    queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),

    // 정산 화면(주문 기반 집계)
    queryClient.invalidateQueries({ queryKey: queryKeys.settlement.all }),
  ])
}
