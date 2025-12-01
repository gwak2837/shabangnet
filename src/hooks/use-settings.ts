'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { CreateTemplateData, UpdateTemplateData } from '@/lib/api/shopping-mall-templates'
import type { CourierMapping, DuplicateCheckSettings, ExclusionPattern, ExclusionSettings } from '@/lib/mock-data'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

import { getMfaSettings } from './queries/mfa'

export function useAddCourierMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<CourierMapping, 'id'>) => api.settings.addCourierMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.courier })
    },
  })
}

export function useAddExclusionPattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pattern: Omit<ExclusionPattern, 'id'>) => api.settings.addExclusionPattern(pattern),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.exclusion })
    },
  })
}

// 샘플 파일 분석
export function useAnalyzeShoppingMallFile() {
  return useMutation({
    mutationFn: ({ file, headerRow }: { file: File; headerRow?: number }) =>
      api.shoppingMallTemplates.analyzeShoppingMallFile(file, headerRow),
  })
}

// Courier Mappings
export function useCourierMappings() {
  return useQuery({
    queryKey: queryKeys.settings.courier,
    queryFn: api.settings.getCourierMappings,
  })
}

// 쇼핑몰 템플릿 생성
export function useCreateShoppingMallTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateTemplateData) => api.shoppingMallTemplates.createShoppingMallTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMallTemplates.all })
    },
  })
}

// 쇼핑몰 템플릿 삭제
export function useDeleteShoppingMallTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.shoppingMallTemplates.deleteShoppingMallTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMallTemplates.all })
    },
  })
}

// Duplicate Check Settings
export function useDuplicateCheckSettings() {
  return useQuery({
    queryKey: queryKeys.settings.duplicateCheck,
    queryFn: api.settings.getDuplicateCheckSettings,
  })
}

// Exclusion Settings
export function useExclusionSettings() {
  return useQuery({
    queryKey: queryKeys.settings.exclusion,
    queryFn: api.settings.getExclusionSettings,
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
    mutationFn: (id: string) => api.settings.removeCourierMapping(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.courier })
    },
  })
}

export function useRemoveExclusionPattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.settings.removeExclusionPattern(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.exclusion })
    },
  })
}

// 쇼핑몰 템플릿 상세 조회
export function useShoppingMallTemplate(id: string) {
  return useQuery({
    queryKey: queryKeys.shoppingMallTemplates.detail(id),
    queryFn: () => api.shoppingMallTemplates.getShoppingMallTemplate(id),
    enabled: !!id,
  })
}

// 쇼핑몰 템플릿 목록 조회
export function useShoppingMallTemplates() {
  return useQuery({
    queryKey: queryKeys.shoppingMallTemplates.all,
    queryFn: api.shoppingMallTemplates.getShoppingMallTemplates,
  })
}

// ============================================
// Shopping Mall Templates
// ============================================

export function useUpdateCourierMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CourierMapping> }) =>
      api.settings.updateCourierMapping(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.courier })
    },
  })
}

export function useUpdateDuplicateCheckSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<DuplicateCheckSettings>) => api.settings.updateDuplicateCheckSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.duplicateCheck })
    },
  })
}

export function useUpdateExclusionSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<ExclusionSettings>) => api.settings.updateExclusionSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.exclusion })
    },
  })
}

// 쇼핑몰 템플릿 수정
export function useUpdateShoppingMallTemplate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateData }) =>
      api.shoppingMallTemplates.updateShoppingMallTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shoppingMallTemplates.all })
    },
  })
}
