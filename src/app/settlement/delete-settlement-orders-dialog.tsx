'use client'

import { useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { deleteSettlementOrders, getSettlementOrderDeletePreview } from '@/app/settlement/actions'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface DeleteSettlementOrdersDialogProps {
  onSuccess?: () => void
  selectedIds: number[]
}

export function DeleteSettlementOrdersDialog({ selectedIds, onSuccess }: DeleteSettlementOrdersDialogProps) {
  const [open, setOpen] = useState(false)
  const [orderCount, setOrderCount] = useState<number | null>(null)
  const [sampleOrderNumbers, setSampleOrderNumbers] = useState<string[] | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const hasSelection = selectedIds.length > 0

  const canDelete = useMemo(() => {
    return confirmText.trim() === '삭제' && orderCount != null
  }, [confirmText, orderCount])

  // 선택한 항목이 없으면, 버튼 자체를 숨겨요.
  if (!hasSelection) {
    return null
  }

  async function handleOpenDialog() {
    setIsLoadingPreview(true)
    setOpen(true)

    const result = await getSettlementOrderDeletePreview(selectedIds)

    if (result.error) {
      toast.error(result.error)
      setOpen(false)
    } else {
      setOrderCount(result.orderCount ?? 0)
      setSampleOrderNumbers(result.sampleOrderNumbers ?? [])
    }

    setIsLoadingPreview(false)
  }

  function handleOpenChange(newOpen: boolean) {
    if (!isPending) {
      setOpen(newOpen)
      if (!newOpen) {
        setOrderCount(null)
        setSampleOrderNumbers(null)
        setConfirmText('')
      }
    }
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteSettlementOrders(selectedIds)

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success(result.success ?? '삭제됐어요.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.settlement.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.orders.all }),
      ])
      setOpen(false)
      onSuccess?.()
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
            정산 주문 삭제
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              {isLoadingPreview ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  삭제 영향 범위를 확인하고 있어요...
                </div>
              ) : orderCount != null ? (
                <>
                  <p>
                    다음 주문이 <strong className="text-red-600">영구적으로 삭제</strong>돼요:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-slate-700">
                    <li>
                      주문 <strong className="text-red-600">{orderCount}건</strong>
                    </li>
                  </ul>

                  {sampleOrderNumbers && sampleOrderNumbers.length > 0 && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                      <p className="text-sm font-medium text-slate-900">삭제 대상 (일부)</p>
                      <ul className="mt-2 grid grid-cols-1 gap-1 text-xs text-slate-700 sm:grid-cols-2">
                        {sampleOrderNumbers.slice(0, 5).map((orderNumber) => (
                          <li className="font-mono" key={orderNumber}>
                            {orderNumber}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="font-medium text-red-600">이 작업은 되돌릴 수 없어요.</p>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700" htmlFor="confirm-delete">
                      삭제하려면 <strong className="text-slate-900">삭제</strong>를 입력해 주세요
                    </Label>
                    <Input
                      autoComplete="off"
                      disabled={isPending}
                      id="confirm-delete"
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="삭제"
                      value={confirmText}
                    />
                  </div>
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
            disabled={isPending || !canDelete}
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
