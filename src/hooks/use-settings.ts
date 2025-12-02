'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getCourierMappings, getDuplicateCheckSettings, getExclusionSettings } from '@/services/settings'
import { getShoppingMallTemplate, getShoppingMallTemplates } from '@/services/shopping-mall-templates'

import { getMfaSettings } from './queries/mfa'

// Courier Mappings
export function useCourierMappings() {
  return useQuery({
    queryKey: queryKeys.settings.courier,
    queryFn: getCourierMappings,
  })
}

// Duplicate Check Settings
export function useDuplicateCheckSettings() {
  return useQuery({
    queryKey: queryKeys.settings.duplicateCheck,
    queryFn: getDuplicateCheckSettings,
  })
}

// Exclusion Settings
export function useExclusionSettings() {
  return useQuery({
    queryKey: queryKeys.settings.exclusion,
    queryFn: getExclusionSettings,
  })
}

// MFA Settings
export function useMfaSettings() {
  return useQuery({
    queryKey: queryKeys.settings.mfa,
    queryFn: async () => {
      const result = await getMfaSettings()
      if (!result.success) throw new Error(result.error)
      return result.settings
    },
  })
}

// 쇼핑몰 템플릿 상세 조회
export function useShoppingMallTemplate(id: string) {
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
