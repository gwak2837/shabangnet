'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getCommonOrderTemplate } from '@/services/order-templates'

export function useCommonOrderTemplate() {
  return useQuery({
    queryKey: queryKeys.orderTemplates.common,
    queryFn: getCommonOrderTemplate,
  })
}
