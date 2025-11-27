'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { OptionManufacturerMapping } from '@/lib/mock-data'

export function useOptionMappings() {
  return useQuery({
    queryKey: queryKeys.optionMappings.all,
    queryFn: api.optionMappings.getAll,
  })
}

export function useCreateOptionMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<OptionManufacturerMapping, 'id' | 'createdAt' | 'updatedAt'>) =>
      api.optionMappings.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all })
    },
  })
}

export function useUpdateOptionMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Omit<OptionManufacturerMapping, 'id' | 'createdAt'>> }) =>
      api.optionMappings.update(id, data),
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
