import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { approveUser, reinstateUser, rejectUser } from '@/components/users/actions'
import { type UserListParams, type UserListResult } from '@/services/users'

export function useApproveUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => approveUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useReinstateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => reinstateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useRejectUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => rejectUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

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

  const response = await fetch(`/api/users?${searchParams.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch users')
  }

  return response.json()
}
