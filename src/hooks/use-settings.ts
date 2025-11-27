'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type {
  SMTPSettings,
  ExclusionSettings,
  ExclusionPattern,
  DuplicateCheckSettings,
  CourierMapping,
} from '@/lib/mock-data'

// SMTP Settings
export function useSmtpSettings() {
  return useQuery({
    queryKey: queryKeys.settings.smtp,
    queryFn: api.settings.getSmtpSettings,
  })
}

export function useUpdateSmtpSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Partial<SMTPSettings>) => api.settings.updateSmtpSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.smtp })
    },
  })
}

// Exclusion Settings
export function useExclusionSettings() {
  return useQuery({
    queryKey: queryKeys.settings.exclusion,
    queryFn: api.settings.getExclusionSettings,
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

export function useAddExclusionPattern() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (pattern: Omit<ExclusionPattern, 'id'>) => api.settings.addExclusionPattern(pattern),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.exclusion })
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

// Duplicate Check Settings
export function useDuplicateCheckSettings() {
  return useQuery({
    queryKey: queryKeys.settings.duplicateCheck,
    queryFn: api.settings.getDuplicateCheckSettings,
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

// Courier Mappings
export function useCourierMappings() {
  return useQuery({
    queryKey: queryKeys.settings.courier,
    queryFn: api.settings.getCourierMappings,
  })
}

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

export function useAddCourierMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<CourierMapping, 'id'>) => api.settings.addCourierMapping(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.courier })
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
