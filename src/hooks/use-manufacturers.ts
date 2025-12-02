'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Manufacturer } from '@/services/manufacturers.types'

import { queryKeys } from '@/common/constants/query-keys'
import { create, getAll, getById, remove, update } from '@/services/manufacturers'

export function useCreateManufacturer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Manufacturer, 'id' | 'lastOrderDate' | 'orderCount'>) => create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all })
    },
  })
}

export function useDeleteManufacturer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all })
    },
  })
}

export function useManufacturer(id: string) {
  return useQuery({
    queryKey: queryKeys.manufacturers.detail(id),
    queryFn: () => getById(id),
    enabled: !!id,
  })
}

export function useManufacturers() {
  return useQuery({
    queryKey: queryKeys.manufacturers.all,
    queryFn: getAll,
  })
}

export function useUpdateManufacturer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Manufacturer> }) => update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.detail(variables.id) })
    },
  })
}
