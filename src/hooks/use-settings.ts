'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getAllSynonyms } from '@/services/column-synonyms'
import { getDuplicateCheckSettings } from '@/services/settings'
import { getShoppingMallTemplate, getShoppingMallTemplates } from '@/services/shopping-mall-templates'

import { getMFASettings } from './queries/mfa'

// Column Synonyms
export function useColumnSynonyms() {
  return useQuery({
    queryKey: queryKeys.settings.synonyms,
    queryFn: getAllSynonyms,
  })
}

// Duplicate Check Settings
export function useDuplicateCheckSettings() {
  return useQuery({
    queryKey: queryKeys.settings.duplicateCheck,
    queryFn: getDuplicateCheckSettings,
  })
}

// MFA Settings
export function useMFASettings() {
  return useQuery({
    queryKey: queryKeys.settings.mfa,
    queryFn: async () => {
      const result = await getMFASettings()
      if (!result.success) throw new Error(result.error)
      return result.settings
    },
  })
}

// 쇼핑몰 템플릿 상세 조회
export function useShoppingMallTemplate(id: number) {
  return useQuery({
    queryKey: queryKeys.shoppingMallTemplates.detail(id),
    queryFn: () => getShoppingMallTemplate(id),
    enabled: !!id,
  })
}

// 쇼핑몰 템플릿 목록 조회
export function useShoppingMallTemplates() {
  return useQuery({
    queryKey: queryKeys.shoppingMallTemplates.all,
    queryFn: getShoppingMallTemplates,
  })
}
