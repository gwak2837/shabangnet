'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getAll, getById } from '@/services/products'

export function useProduct(id: string) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => getById(id),
    enabled: !!id,
  })
}

export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products.all,
    queryFn: getAll,
  })
}
