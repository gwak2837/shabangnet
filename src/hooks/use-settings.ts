'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import {
  addCourierMapping,
  addExclusionPattern,
  type CourierMapping,
  type DuplicateCheckSettings,
  type ExclusionPattern,
  type ExclusionSettings,
  getCourierMappings,
  getDuplicateCheckSettings,
  getExclusionSettings,
  removeCourierMapping,
  removeExclusionPattern,
  updateCourierMapping,
  updateDuplicateCheckSettings,
  updateExclusionSettings,
} from '@/services/settings'
import {
  analyzeShoppingMallFile,
  createShoppingMallTemplate,
  type CreateTemplateData,
  deleteShoppingMallTemplate,
  getShoppingMallTemplate,
  getShoppingMallTemplates,
  updateShoppingMallTemplate,
  type UpdateTemplateData,
} from '@/services/shopping-mall-templates'

import { getMfaSettings } from './queries/mfa'

export function useAddCourierMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<CourierMapping, 'id'>) => addCourierMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.courier })
    },
  })
}

export function useAddExclusionPattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pattern: Omit<ExclusionPattern, 'id'>) => addExclusionPattern(pattern),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.exclusion })
    },
  })
}

// 샘플 파일 분석
export function useAnalyzeShoppingMallFile() {
  return useMutation({
    mutationFn: ({ file, headerRow }: { file: File; headerRow?: number }) => analyzeShoppingMallFile(file, headerRow),
  })
}

// Courier Mappings
export function useCourierMappings() {
  return useQuery({
    queryKey: queryKeys.settings.courier,
    queryFn: getCourierMappings,
  })
}

// 쇼핑몰 템플릿 생성
export function useCreateShoppingMallTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTemplateData) => createShoppingMallTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMallTemplates.all })
    },
  })
}

// 쇼핑몰 템플릿 삭제
export function useDeleteShoppingMallTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteShoppingMallTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMallTemplates.all })
    },
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

export function useRemoveCourierMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removeCourierMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.courier })
    },
  })
}

export function useRemoveExclusionPattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => removeExclusionPattern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.exclusion })
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

export function useUpdateCourierMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { data: Partial<CourierMapping>; id: string }) => updateCourierMapping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.courier })
    },
  })
}

export function useUpdateDuplicateCheckSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<DuplicateCheckSettings>) => updateDuplicateCheckSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.duplicateCheck })
    },
  })
}

export function useUpdateExclusionSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<ExclusionSettings>) => updateExclusionSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.exclusion })
    },
  })
}

// 쇼핑몰 템플릿 수정
export function useUpdateShoppingMallTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { data: UpdateTemplateData; id: string }) => updateShoppingMallTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMallTemplates.all })
    },
  })
}
