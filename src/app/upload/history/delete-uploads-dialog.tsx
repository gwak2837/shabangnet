'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteUploads, getDeletePreview } from '@/app/upload/actions'
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

interface DeleteUploadsDialogProps {
  onSuccess?: () => void
  selectedIds: number[]
}

export function DeleteUploadsDialog({ selectedIds, onSuccess }: DeleteUploadsDialogProps) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<{ orderCount: number; uploadCount: number } | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  // 버튼 클릭 시 미리보기 데이터 가져오고 모달 열기
  async function handleOpenDialog() {
    if (selectedIds.length === 0) return

    setIsLoadingPreview(true)
    setOpen(true)

    const result = await getDeletePreview(selectedIds)

    if (result.error) {
      toast.error(result.error)
      setOpen(false)
    } else {
      setPreview({
        uploadCount: result.uploadCount ?? 0,
        orderCount: result.orderCount ?? 0,
      })
    }

    setIsLoadingPreview(false)
  }

  function handleOpenChange(newOpen: boolean) {
    if (!isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        setPreview(null)
      }
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteUploads(selectedIds)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.success)
        // 쿼리 무효화
        await queryClient.invalidateQueries({ queryKey: queryKeys.uploads.all })
        setOpen(false)
        onSuccess?.()
      }
    })
  }

  const isDisabled = selectedIds.length === 0

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
            업로드 기록 삭제
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  삭제 영향 범위를 확인하고 있어요...
                </div>
              ) : preview ? (
                <>
                  <p>다음 항목이 영구적으로 삭제돼요:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>
                      업로드 기록 <strong className="text-red-600">{preview.uploadCount}건</strong>
                    </li>
                    <li>
                      연관된 주문 데이터 <strong className="text-red-600">{preview.orderCount}건</strong>
                    </li>
                  </ul>
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
            disabled={isPending || isLoadingPreview}
            onClick={handleDelete}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
