'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Manufacturer } from '@/lib/mock-data'

import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'

export function useCreateManufacturer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Manufacturer, 'id' | 'lastOrderDate' | 'orderCount'>) => api.manufacturers.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all })
    },
  })
}

export function useDeleteManufacturer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.manufacturers.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all })
    },
  })
}

export function useManufacturer(id: string) {
  return useQuery({
    queryKey: queryKeys.manufacturers.detail(id),
    queryFn: () => api.manufacturers.getById(id),
    enabled: !!id,
  })
}

export function useManufacturers() {
  return useQuery({
    queryKey: queryKeys.manufacturers.all,
    queryFn: api.manufacturers.getAll,
  })
}

export function useUpdateManufacturer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Manufacturer> }) => api.manufacturers.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.detail(variables.id) })
    },
  })
}
