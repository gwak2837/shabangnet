'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteProducts, getProductDeletePreview } from '@/app/product/actions'
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

interface DeleteProductsDialogProps {
  onSuccess?: () => void
  selectedIds: number[]
}

export function DeleteProductsDialog({ selectedIds, onSuccess }: DeleteProductsDialogProps) {
  const [open, setOpen] = useState(false)
  const [productCount, setProductCount] = useState<number | null>(null)
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

    const result = await getProductDeletePreview(selectedIds)

    if (result.error) {
      toast.error(result.error)
      setOpen(false)
    } else {
      setProductCount(result.productCount ?? 0)
    }

    setIsLoadingPreview(false)
  }

  function handleOpenChange(newOpen: boolean) {
    if (!isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        setProductCount(null)
      }
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProducts(selectedIds)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(result.success)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
          queryClient.invalidateQueries({ queryKey: queryKeys.orders.matching }),
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
            상품 삭제
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  삭제 영향 범위를 확인하고 있어요...
                </div>
              ) : productCount != null ? (
                <>
                  <p>다음 항목이 영구적으로 삭제돼요:</p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>
                      상품 <strong className="text-red-600">{productCount}개</strong>
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
            disabled={isPending || productCount == null}
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
