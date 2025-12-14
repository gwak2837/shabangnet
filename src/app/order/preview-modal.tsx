'use client'

import { FileSpreadsheet, MapPin, Package, User } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { formatCurrency, formatProductNameWithOption, formatRecipientName } from '@/utils/format/number'

import type { OrderBatch } from './hook'

interface PreviewModalProps {
  batch: OrderBatch | null
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function PreviewModal({ batch, open, onOpenChange }: PreviewModalProps) {
  if (!batch) {
    return null
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-slate-600" />
            주문 미리보기
          </DialogTitle>
          <DialogDescription>발주서에 포함될 주문 목록을 확인해요.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-y-auto flex-1 pr-2">
          {/* Manufacturer */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card">
                <User className="h-5 w-5 text-slate-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-900">{batch.manufacturerName}</p>
                <p className="text-sm text-slate-500">{batch.email}</p>
                {batch.ccEmail && <p className="text-xs text-slate-400">CC: {batch.ccEmail}</p>}
              </div>
              <Badge className="bg-slate-100 text-slate-700" variant="secondary">
                총 {batch.totalOrders}건
              </Badge>
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-4 w-4 text-slate-600" />
              <p className="font-medium text-slate-900">요약</p>
            </div>
            <Separator className="my-3" />
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">주문 건수</p>
                <p className="font-semibold text-slate-900">{batch.totalOrders}건</p>
              </div>
              <div>
                <p className="text-slate-500">총 금액</p>
                <p className="font-semibold text-slate-900">{formatCurrency(batch.totalAmount)}</p>
              </div>
            </div>
          </div>

          {/* Orders */}
          <div className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-slate-600" />
              <p className="font-medium text-slate-900">주문 목록</p>
            </div>

            {batch.orders.length === 0 ? (
              <p className="text-sm text-slate-500">주문이 없어요</p>
            ) : (
              <div className="max-h-[50vh] overflow-y-auto rounded-md border border-slate-100 bg-slate-50">
                <div className="divide-y divide-slate-100">
                  {batch.orders.map((order) => (
                    <div className="px-3 py-3 text-sm" key={order.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800 truncate">
                            {formatProductNameWithOption(order.productName, order.optionName)}
                          </p>
                          <div className="mt-1 flex items-start gap-2 text-xs text-slate-500">
                            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <p className="truncate">
                              {formatRecipientName(order.customerName, order.orderName)} · {order.address}
                            </p>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">주문번호: {order.sabangnetOrderNumber}</p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="font-medium text-slate-800">{order.quantity}개</p>
                          <p className="text-xs text-slate-500">{formatCurrency(order.price * order.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
