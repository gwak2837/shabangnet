'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteOptionMappings, getOptionMappingDeletePreview } from '@/app/option/actions'
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

interface DeleteOptionMappingsDialogProps {
  onSuccess?: () => void
  selectedIds: number[]
}

interface PreviewCounts {
  affectedOrdersCount: number
  mappingCount: number
}

export function DeleteOptionMappingsDialog({ selectedIds, onSuccess }: DeleteOptionMappingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<PreviewCounts | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()
  const hasSelection = selectedIds.length > 0

  // 선택한 항목이 없으면, 버튼 자체를 숨겨요.
  if (!hasSelection) {
    return null
  }

  async function handleOpenDialog() {
    setIsLoadingPreview(true)
    setOpen(true)

    const result = await getOptionMappingDeletePreview(selectedIds)

    if (result.error) {
      toast.error(result.error)
      setOpen(false)
    } else {
      setPreview({
        mappingCount: result.mappingCount ?? 0,
        affectedOrdersCount: result.affectedOrdersCount ?? 0,
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
      const result = await deleteOptionMappings(selectedIds)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.success)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.batches }),
        ])
        setOpen(false)
        onSuccess?.()
      }
    })
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange} open={open}>
      <Button className="tabular-nums" onClick={handleOpenDialog} size="sm" variant="destructive">
        <Trash2 className="mr-2 h-4 w-4" />
        선택 삭제 ({selectedIds.length})
      </Button>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            옵션 연결 삭제
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
                  <p>다음 항목이 삭제돼요:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>
                      옵션 연결 <strong className="text-red-600">{preview.mappingCount}건</strong>
                    </li>
                  </ul>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">기존 주문은 변경되지 않아요</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>
                        참고: 같은 상품/옵션인 미완료 주문이 <strong className="text-slate-900">{preview.affectedOrdersCount}건</strong>{' '}
                        있어요.
                      </li>
                      <li>삭제해도 이미 업로드된 주문 데이터는 그대로 유지돼요.</li>
                      <li>앞으로 업로드되는 주문부터 이 옵션 연결이 적용되지 않아요.</li>
                    </ul>
                  </div>
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
            disabled={isPending || preview == null}
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
