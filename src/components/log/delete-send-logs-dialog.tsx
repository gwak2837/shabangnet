'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteSendLogs, getDeletePreview } from '@/app/order/history/actions'
import { queryKeys } from '@/common/constants/query-keys'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

interface DeleteSendLogsDialogProps {
  onSuccess?: () => void
  selectedIds: number[]
}

export function DeleteSendLogsDialog({ selectedIds, onSuccess }: DeleteSendLogsDialogProps) {
  const [open, setOpen] = useState(false)
  const [logItemCount, setLogItemCount] = useState<number | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()
  const isDisabled = selectedIds.length === 0

  async function handleOpenDialog() {
    if (selectedIds.length === 0) return

    setIsLoadingPreview(true)
    setOpen(true)

    const result = await getDeletePreview(selectedIds)

    if (result.error) {
      toast.error(result.error)
      setOpen(false)
    } else {
      setLogItemCount(result.logItemCount ?? 0)
    }

    setIsLoadingPreview(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (isPending) return
    setOpen(nextOpen)
    if (!nextOpen) {
      setLogItemCount(null)
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSendLogs(selectedIds)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(result.success ?? '삭제됐어요')
      await queryClient.invalidateQueries({ queryKey: queryKeys.logs.all })
      setOpen(false)
      onSuccess?.()
    })
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <Button className="tabular-nums" disabled={isDisabled} onClick={handleOpenDialog} size="sm" variant="destructive">
        <Trash2 className="mr-2 h-4 w-4" />
        선택 삭제 ({selectedIds.length})
      </Button>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            발송 기록 삭제
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  삭제 영향 범위를 확인하고 있어요...
                </div>
              ) : logItemCount != null ? (
                <>
                  <p>다음 항목이 영구적으로 삭제돼요:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>
                      발송 기록 <strong className="text-red-600">{selectedIds.length}건</strong>
                    </li>
                    <li>
                      발송 상세(스냅샷) <strong className="text-red-600">{logItemCount}건</strong>
                    </li>
                  </ul>
                  <p className="text-sm text-slate-600">실제 주문 데이터는 삭제되지 않아요.</p>
                  <p className="font-medium text-red-600">이 작업은 되돌릴 수 없어요.</p>
                </>
              ) : (
                <p>삭제할 항목을 확인하고 있어요...</p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            disabled={isPending || logItemCount == null}
            onClick={handleDelete}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
