'use client'

import { Check, Clock, Loader2, RotateCcw, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { queryKeys } from '@/common/constants/query-keys'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useServerAction } from '@/hooks/use-server-action'
import { type UserListItem, type UserStatus } from '@/services/users'

import { approveUser, reinstateUser, rejectUser } from './actions'

interface UserTableProps {
  isLoading?: boolean
  users: UserListItem[]
}

const statusConfig: Record<UserStatus, { label: string; className: string }> = {
  pending: {
    label: '대기',
    className: 'bg-amber-100 text-amber-700',
  },
  approved: {
    label: '승인',
    className: 'bg-emerald-100 text-emerald-700',
  },
  rejected: {
    label: '거부',
    className: 'bg-red-100 text-red-700',
  },
}

const authTypeLabels: Record<string, string> = {
  password: '비밀번호',
  passkey: '패스키',
  social: '소셜',
}

export function UserTable({ users, isLoading }: UserTableProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'approve' | 'reinstate' | 'reject'
    user: UserListItem
  } | null>(null)

  const { execute: executeApprove, isPending: isApproving } = useServerAction(approveUser, {
    invalidateKeys: [queryKeys.users.all],
    onSuccess: (result) => {
      if (result.success) toast.success(result.success)
      setConfirmDialog(null)
    },
    onError: (error) => {
      toast.error(error)
      setConfirmDialog(null)
    },
  })

  const { execute: executeReject, isPending: isRejecting } = useServerAction(rejectUser, {
    invalidateKeys: [queryKeys.users.all],
    onSuccess: (result) => {
      if (result.success) toast.success(result.success)
      setConfirmDialog(null)
    },
    onError: (error) => {
      toast.error(error)
      setConfirmDialog(null)
    },
  })

  const { execute: executeReinstate, isPending: isReinstating } = useServerAction(reinstateUser, {
    invalidateKeys: [queryKeys.users.all],
    onSuccess: (result) => {
      if (result.success) toast.success(result.success)
      setConfirmDialog(null)
    },
    onError: (error) => {
      toast.error(error)
      setConfirmDialog(null)
    },
  })

  const handleAction = () => {
    if (!confirmDialog) return

    const { type, user } = confirmDialog

    switch (type) {
      case 'approve':
        executeApprove(user.id)
        break
      case 'reinstate':
        executeReinstate(user.id)
        break
      case 'reject':
        executeReject(user.id)
        break
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const isPending = isApproving || isRejecting || isReinstating

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (users.length === 0) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">사용자가 없어요</div>
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">사용자</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">상태</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">인증 방식</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">가입일</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => {
              const config = statusConfig[user.status]
              return (
                <tr className="bg-white hover:bg-slate-50" key={user.id}>
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{user.name || '이름 없음'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.className}`}
                    >
                      {user.status === 'pending' && <Clock className="h-3 w-3" />}
                      {user.status === 'approved' && <Check className="h-3 w-3" />}
                      {user.status === 'rejected' && <X className="h-3 w-3" />}
                      {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{authTypeLabels[user.authType] ?? user.authType}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{formatDate(user.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {user.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => setConfirmDialog({ type: 'approve', user })}
                            size="sm"
                            variant="outline"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            승인
                          </Button>
                          <Button
                            onClick={() => setConfirmDialog({ type: 'reject', user })}
                            size="sm"
                            variant="outline"
                          >
                            <X className="mr-1 h-3 w-3" />
                            거부
                          </Button>
                        </>
                      )}
                      {user.status === 'rejected' && (
                        <Button
                          onClick={() => setConfirmDialog({ type: 'reinstate', user })}
                          size="sm"
                          variant="outline"
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          복원
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Confirm Dialog */}
      <Dialog onOpenChange={() => setConfirmDialog(null)} open={!!confirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmDialog?.type === 'approve' && '사용자 승인'}
              {confirmDialog?.type === 'reject' && '사용자 거부'}
              {confirmDialog?.type === 'reinstate' && '사용자 복원'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.type === 'approve' &&
                `${confirmDialog.user.name ?? confirmDialog.user.email}님을 승인하시겠어요?`}
              {confirmDialog?.type === 'reject' &&
                `${confirmDialog.user.name ?? confirmDialog.user.email}님의 가입을 거부하시겠어요? 해당 이메일로 재가입이 차단됩니다.`}
              {confirmDialog?.type === 'reinstate' &&
                `${confirmDialog.user.name ?? confirmDialog.user.email}님을 대기 상태로 복원하시겠어요?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={isPending} onClick={() => setConfirmDialog(null)} variant="outline">
              취소
            </Button>
            <Button
              disabled={isPending}
              onClick={handleAction}
              variant={confirmDialog?.type === 'reject' ? 'destructive' : 'default'}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : '확인'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
