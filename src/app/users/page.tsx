'use client'

import { useState } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { UserTable } from '@/components/users/user-table'
import { useUsers } from '@/hooks/use-users'
import { type UserStatus } from '@/services/users'

type StatusFilter = 'all' | UserStatus

const statusFilters: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '대기' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '거부' },
]

export default function UsersPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useUsers({
    status: statusFilter,
    page,
    limit: 20,
  })

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
                setPage(1)
              }}
              size="sm"
              variant={statusFilter === filter.value ? 'default' : 'outline'}
            >
              {filter.label}
            </Button>
          ))}
        </div>

        {/* User Table */}
        <UserTable isLoading={isLoading} users={data?.users ?? []} />

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              size="sm"
              variant="outline"
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {data.totalPages}
            </span>
            <Button
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              size="sm"
              variant="outline"
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </AppShell>
  )
}
