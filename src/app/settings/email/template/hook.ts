'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

import { ensureDefaultOrderTemplateAction } from './action'

export function useEmailTemplate() {
  return useQuery({
    queryKey: queryKeys.settings.emailTemplate,
    queryFn: async () => {
      const result = await ensureDefaultOrderTemplateAction()
      if (!result.success || !result.template) {
        throw new Error(result.error || '템플릿을 불러올 수 없습니다')
      }
      return result.template
    },
  })
}
