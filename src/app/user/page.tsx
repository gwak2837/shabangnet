'use client'

import { useMemo, useState } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { useUsers } from '@/hooks/use-users'
import { type UserStatus } from '@/services/users'

import { UserTable } from './user-table'

type StatusFilter = 'all' | UserStatus

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '거부' },
]

export default function UsersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useUsers({
    status: statusFilter,
    limit: 20,
  })

  const users = useMemo(() => data?.pages.flatMap((page) => page.users) ?? [], [data])
  const total = data?.pages[0]?.total

  return (
    <AppShell description="사용자 가입 승인 및 관리" title="사용자 관리">
      <div className="flex flex-col gap-6">
        {/* Filters */}
        <div className="flex items-center gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              onClick={() => {
                setStatusFilter(filter.value)
              }}
              size="sm"
              variant={statusFilter === filter.value ? 'default' : 'outline'}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* User Table */}
        <UserTable
          fetchNextPage={() => fetchNextPage()}
          hasNextPage={hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          isLoading={isLoading}
          total={total}
          users={users}
        />
      </div>
    </AppShell>
  )
}
