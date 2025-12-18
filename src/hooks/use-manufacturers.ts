'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getAll, getById, getOrderTemplate } from '@/services/manufacturers'

export function useManufacturer(id: number) {
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

export function useOrderTemplate(manufacturerId: number | undefined) {
  return useQuery({
    queryKey: queryKeys.orderTemplates.manufacturer(manufacturerId || 0),
    queryFn: () => (manufacturerId ? getOrderTemplate(manufacturerId) : null),
    enabled: !!manufacturerId,
  })
}
