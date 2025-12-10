'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

import { getExclusionSettings } from './action'

export function useExclusionSettings() {
  return useQuery({
    queryKey: queryKeys.settings.exclusion,
    queryFn: getExclusionSettings,
  })
}
