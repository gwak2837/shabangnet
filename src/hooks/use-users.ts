'use client'

import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { type UserListParams, type UserListResult } from '@/services/users'

export function useUsers(params: UserListParams = {}) {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => fetchUsers(params),
  })
}

async function fetchUsers(params: UserListParams): Promise<UserListResult> {
  const searchParams = new URLSearchParams()

  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status)
  }
  if (params.page) {
    searchParams.set('page', String(params.page))
  }
  if (params.limit) {
    searchParams.set('limit', String(params.limit))
  }

  const response = await fetch(`/api/user?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  return response.json()
}
