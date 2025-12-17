'use client'

import { useInfiniteQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { type UserListParams, type UserListResult } from '@/services/users'

export function useUsers(params: UserListParams = {}) {
  const { status, limit = 20 } = params

  return useInfiniteQuery({
    queryKey: queryKeys.users.list({ status, limit }),
    queryFn: async ({ pageParam }): Promise<UserListResult> => fetchUsers({ status, limit, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: null as string | null,
  })
}

async function fetchUsers(params: { cursor?: string | null; limit: number; status?: UserListParams['status'] }): Promise<UserListResult> {
  const searchParams = new URLSearchParams()

  if (params.status && params.status !== 'all') {
    searchParams.set('status', params.status)
  }
  if (params.cursor) {
    searchParams.set('cursor', params.cursor)
  }
  searchParams.set('limit', String(params.limit))

  const response = await fetch(`/api/user?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  return response.json()
}
