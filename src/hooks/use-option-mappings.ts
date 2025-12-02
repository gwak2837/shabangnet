'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { create, getAll, type OptionManufacturerMapping, remove, update } from '@/services/option-mappings'

export function useCreateOptionMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>) => create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all })
    },
  })
}

export function useDeleteOptionMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all })
    },
  })
}

export function useOptionMappings() {
  return useQuery({
    queryKey: queryKeys.optionMappings.all,
    queryFn: getAll,
  })
}

export function useUpdateOptionMapping() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { data: Partial<Omit<OptionManufacturerMapping, 'createdAt' | 'id'>>; id: string }) =>
      update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all })
    },
  })
}
