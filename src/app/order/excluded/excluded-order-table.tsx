'use client'

import { Ban, ChevronRight, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency } from '@/utils/format/number'

import { useExcludedOrderBatches } from '../hook'

export function ExcludedOrderTable() {
  const { data: batches = [], isLoading } = useExcludedOrderBatches()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  if (batches.length === 0) {
    return (
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-4">
            <Ban className="h-6 w-6 text-slate-400" />
          </div>
          <p className="text-slate-500 text-center">발송 제외된 주문이 없습니다</p>
          <p className="text-sm text-slate-400 mt-1">F열 값이 제외 패턴과 일치하는 주문이 없어요</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제외 사유</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                주문 수
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                총 금액
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => {
              const sampleOrders = batch.orders.slice(0, 3)

              return (
                <TableRow className="hover:bg-slate-50 transition-colors" key={batch.reason}>
                  <TableCell className="align-top">
                    <details className="group">
                      <summary className="flex cursor-pointer list-none items-start gap-3 [&::-webkit-details-marker]:hidden">
                        <ChevronRight
                          aria-hidden="true"
                          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90"
                        />
                        <div className="min-w-0 space-y-1">
                          <p className="truncate font-medium text-slate-900">{batch.reason}</p>
                          {sampleOrders.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {sampleOrders.map((o) => (
                                <Badge
                                  className="bg-slate-100 text-slate-600 text-xs font-mono max-w-[220px] truncate"
                                  key={o.id}
                                  variant="secondary"
                                >
                                  {o.sabangnetOrderNumber}
                                </Badge>
                              ))}
                              {batch.orders.length > sampleOrders.length && (
                                <span className="text-xs text-slate-400">
                                  +{batch.orders.length - sampleOrders.length}건
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </summary>

                      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="grid grid-cols-[1fr_auto] gap-2 text-xs text-slate-500">
                          <span>사방넷주문번호</span>
                          <span className="text-right">금액</span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {batch.orders.slice(0, 10).map((o) => (
                            <div className="grid grid-cols-[1fr_auto] gap-2 text-sm" key={o.id}>
                              <span className="font-mono text-slate-700">{o.sabangnetOrderNumber}</span>
                              <span className="text-right tabular-nums text-slate-700">
                                {formatCurrency(o.price * o.quantity)}
                              </span>
                            </div>
                          ))}
                          {batch.orders.length > 10 && (
                            <p className="pt-2 text-xs text-slate-400">
                              나머지 {batch.orders.length - 10}건은 생략했어요
                            </p>
                          )}
                        </div>
                      </div>
                    </details>
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                    {batch.totalOrders}건
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                    {formatCurrency(batch.totalAmount)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
