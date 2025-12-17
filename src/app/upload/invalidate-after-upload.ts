import type { QueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

/**
 * 업로드로 인해 바뀌는 데이터(주문/업로드 기록/대시보드 통계/제조사/상품 등) 캐시를 한 번에 무효화해요.
 *
 * - 업로드는 주문/업로드 테이블에 영향을 주고, 업로드 과정에서 제조사/상품이 자동 생성될 수도 있어요.
 * - 따라서 관련 화면(헤더 통계, 제조사 관리, 상품 연결, 발주 생성 등)이 즉시 최신 상태로 보이도록 합니다.
 */
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
