'use client'

import { useInfiniteQuery, useQuery } from '@tanstack/react-query'

import type { Product } from '@/services/products'

import { queryKeys } from '@/common/constants/query-keys'
import { getById } from '@/services/products'

interface ProductListFilters {
  priceError?: boolean
  search?: string
  unmapped?: boolean
}

interface ProductListResponse {
  items: Product[]
  nextCursor: string | null
  summary: {
    mappedProducts: number
    priceErrorProducts: number
    totalProducts: number
    unmappedProducts: number
  }
}

interface UseProductsParams {
  filters?: ProductListFilters
  limit?: number
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => getById(id),
    enabled: !!id,
  })
}

export function useProducts(params: UseProductsParams = {}) {
  const { filters, limit = 50 } = params
  const { search, unmapped, priceError } = filters ?? {}

  return useInfiniteQuery({
    queryKey: queryKeys.products.list({ limit, search, unmapped, priceError }),
    queryFn: async ({ pageParam }): Promise<ProductListResponse> => {
      const searchParams = new URLSearchParams()
      searchParams.set('limit', String(limit))
      if (pageParam) {
        searchParams.set('cursor', pageParam)
      }
      if (search) {
        searchParams.set('search', search)
      }
      if (unmapped) {
        searchParams.set('unmapped', 'true')
      }
      if (priceError) {
        searchParams.set('price-error', 'true')
      }

      const response = await fetch(`/api/products?${searchParams.toString()}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }
      return response.json()
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  })
}
