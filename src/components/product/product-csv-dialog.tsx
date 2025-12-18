'use client'

import { AlertTriangle, Loader2, Upload } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { useFormAction } from '@/hooks/use-server-action'

import type { ProductCsvImportResult } from './product-csv.types'

import { importProductsCsv } from './csv-actions'
import { PRODUCT_CSV_HEADER } from './product-csv.types'

interface ProductCsvDialogProps {
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function ProductCsvDialog({ open, onOpenChange }: ProductCsvDialogProps) {
  const [state, formAction, isPending] = useFormAction<ProductCsvImportResult | null, FormData>(
    importProductsCsv,
    null,
    {
      invalidateKeys: [queryKeys.products.all, queryKeys.orders.batches, queryKeys.orders.matching],
      onError: (error) => toast.error(error),
      onSuccess: (result) => {
        if (!result || 'error' in result) {
          return
        }

        const parts = [
          result.created ? `추가 ${result.created}개` : null,
          result.updated ? `수정 ${result.updated}개` : null,
          result.skipped ? `건너뜀 ${result.skipped}행` : null,
        ].filter(Boolean)

        toast.success(parts.length > 0 ? `CSV를 반영했어요 (${parts.join(' · ')})` : 'CSV를 반영했어요')
      },
    },
  )

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Upload className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <DialogTitle>CSV 업로드</DialogTitle>
              <DialogDescription>상품코드 기준으로 업데이트하고, 없으면 새로 추가해요.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <ul className="list-disc pl-5 space-y-1">
            <li>빈 칸은 기존 값을 그대로 유지해요.</li>
            <li>제조사명은 제조사 관리에 등록된 이름과 일치해야 해요.</li>
            <li>잘못된 행은 건너뛰고, 나머지만 반영해요.</li>
            <li className="break-all">
              헤더 예시: <span className="font-mono">{PRODUCT_CSV_HEADER.join(',')}</span>
            </li>
          </ul>
        </div>

        <form action={formAction} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-slate-900" htmlFor="product-csv">
              CSV 파일
            </label>
            <Input
              accept=".csv,text/csv"
              aria-disabled={isPending}
              disabled={isPending}
              id="product-csv"
              name="file"
              required
              type="file"
            />
            <p className="text-xs text-slate-500">엑셀에서 저장할 때 “CSV UTF-8”로 저장하면 한글이 안전해요.</p>
          </div>

          {state && 'error' in state && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {state.error}
            </div>
          )}

          {state && 'success' in state && (
            <div className="rounded-lg border border-slate-200 bg-background p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-slate-700">
                  총 <span className="font-semibold text-slate-900">{state.totalRows}</span>행 중{' '}
                  <span className="font-semibold text-slate-900">{state.created}</span>개 추가,{' '}
                  <span className="font-semibold text-slate-900">{state.updated}</span>개 수정,{' '}
                  <span className="font-semibold text-slate-900">{state.skipped}</span>행 건너뜀
                </div>
                {state.errors.length > 0 && (
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    {state.errors.length}개 오류
                  </div>
                )}
              </div>

              {state.errors.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-md border border-amber-200 bg-amber-50/60 p-2">
                  <ul className="space-y-1 text-xs text-amber-900">
                    {state.errors.slice(0, 50).map((e) => (
                      <li key={`${e.row}-${e.productCode ?? ''}-${e.message}`}>
                        <span className="font-medium">[{e.row}행]</span> {e.productCode ? `${e.productCode}: ` : ''}
                        {e.message}
                      </li>
                    ))}
                  </ul>
                  {state.errors.length > 50 && (
                    <p className="mt-2 text-xs text-amber-700">표시는 50개까지만 보여줘요.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button disabled={isPending} onClick={() => onOpenChange(false)} type="button" variant="outline">
              닫기
            </Button>
            <Button className="bg-slate-900 hover:bg-slate-800" disabled={isPending} type="submit">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              업로드
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
