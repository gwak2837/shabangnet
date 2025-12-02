'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getAll } from '@/services/option-mappings'

export function useOptionMappings() {
  return useQuery({
    queryKey: queryKeys.optionMappings.all,
    queryFn: getAll,
  })
}
