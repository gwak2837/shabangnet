'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { OptionManufacturerMapping } from '@/lib/mock-data'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

export function useCreateOptionMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>) =>
      api.optionMappings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all })
    },
  })
}

export function useDeleteOptionMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.optionMappings.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all })
    },
  })
}

export function useOptionMappings() {
  return useQuery({
    queryKey: queryKeys.optionMappings.all,
    queryFn: api.optionMappings.getAll,
  })
}

export function useUpdateOptionMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<OptionManufacturerMapping, 'createdAt' | 'id'>> }) =>
      api.optionMappings.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all })
    },
  })
}
