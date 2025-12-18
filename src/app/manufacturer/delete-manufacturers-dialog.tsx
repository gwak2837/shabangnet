'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteManufacturers, getManufacturerDeletePreview } from '@/app/manufacturer/actions'
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

interface DeleteManufacturersDialogProps {
  onSuccess?: () => void
  selectedIds: number[]
}

interface PreviewCounts {
  emailLogCount: number
  emailLogItemCount: number
  invoiceTemplateCount: number
  manufacturerCount: number
  optionMappingCount: number
  orderCount: number
  orderTemplateCount: number
  productCount: number
}

export function DeleteManufacturersDialog({ selectedIds, onSuccess }: DeleteManufacturersDialogProps) {
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

    const result = await getManufacturerDeletePreview(selectedIds)

    if (result.error) {
      toast.error(result.error)
      setOpen(false)
    } else {
      setPreview({
        manufacturerCount: result.manufacturerCount ?? 0,
        productCount: result.productCount ?? 0,
        optionMappingCount: result.optionMappingCount ?? 0,
        orderTemplateCount: result.orderTemplateCount ?? 0,
        invoiceTemplateCount: result.invoiceTemplateCount ?? 0,
        orderCount: result.orderCount ?? 0,
        emailLogCount: result.emailLogCount ?? 0,
        emailLogItemCount: result.emailLogItemCount ?? 0,
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
      const result = await deleteManufacturers(selectedIds)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.success)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.manufacturers.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.optionMappings.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.batches }),
          queryClient.invalidateQueries({ queryKey: queryKeys.logs.all }),
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
            제조사 삭제
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
                      제조사 <strong className="text-red-600">{preview.manufacturerCount}곳</strong>
                    </li>
                    <li>
                      옵션 연결 <strong className="text-red-600">{preview.optionMappingCount}건</strong>
                    </li>
                    <li>
                      발주서 템플릿 <strong className="text-red-600">{preview.orderTemplateCount}건</strong>
                    </li>
                    <li>
                      송장 템플릿 <strong className="text-red-600">{preview.invoiceTemplateCount}건</strong>
                    </li>
                  </ul>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <p className="font-medium text-slate-900">다음 항목은 삭제되지 않고, 제조사 연결만 해제돼요:</p>
                    <ul className="mt-2 list-disc list-inside space-y-1">
                      <li>
                        상품 <strong className="text-slate-900">{preview.productCount}건</strong>
                      </li>
                      <li>
                        주문 <strong className="text-slate-900">{preview.orderCount}건</strong>
                      </li>
                      <li>
                        발송 기록 <strong className="text-slate-900">{preview.emailLogCount}건</strong>
                        {preview.emailLogItemCount > 0 && (
                          <span className="text-slate-500"> (상세 {preview.emailLogItemCount}건)</span>
                        )}
                      </li>
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
