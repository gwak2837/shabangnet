'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

import { getOrderEmailTemplateAction } from './action'

export function useEmailTemplate() {
  return useQuery({
    queryKey: queryKeys.settings.emailTemplate,
    queryFn: async () => {
      const result = await getOrderEmailTemplateAction()
      if (!result.success) {
        throw new Error(result.error || '템플릿을 불러올 수 없어요')
      }
      return result.template
    },
  })
}
