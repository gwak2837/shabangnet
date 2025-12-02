'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getAll, getById, getOrderTemplateOrDefault } from '@/services/manufacturers'

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

export function useOrderTemplate(manufacturerId: string | undefined) {
  return useQuery({
    queryKey: ['orderTemplate', manufacturerId],
    queryFn: () => (manufacturerId ? getOrderTemplateOrDefault(manufacturerId) : null),
    enabled: !!manufacturerId,
  })
}
