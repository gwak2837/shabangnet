'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { Product } from '@/lib/mock-data'

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: api.products.getAll,
  })
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => api.products.getById(id),
    enabled: !!id,
  })
}

export function useCreateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => api.products.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}

export function useUpdateProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) => api.products.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.products.detail(variables.id) })
    },
  })
}

export function useDeleteProduct() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.products.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.products.all })
    },
  })
}
