'use client'

import { Ban, Loader2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency, getExclusionLabelSync } from '@/utils/format/number'

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
          <p className="text-sm text-slate-400 mt-1">F열 값이 제외 패턴과 일치하는 주문이 없습니다</p>
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
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                주문 수
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                총 금액
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">이메일</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제외 사유</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => {
              // 주문들의 fulfillmentType을 라벨로 변환하고 중복 제거
              const exclusionLabels = [
                ...new Set(
                  batch.orders
                    .map((o) => getExclusionLabelSync(o.fulfillmentType))
                    .filter((label): label is string => label !== null),
                ),
              ]

              return (
                <TableRow className="hover:bg-slate-50 transition-colors" key={batch.manufacturerId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                        {batch.manufacturerName.slice(0, 2)}
                      </div>
                      <span className="font-medium text-slate-900">{batch.manufacturerName}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                    {batch.totalOrders}건
                  </TableCell>
                  <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                    {formatCurrency(batch.totalAmount)}
                  </TableCell>
                  <TableCell className="text-slate-600">{batch.email}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {exclusionLabels.slice(0, 2).map((label, idx) => (
                        <Badge
                          className="bg-violet-50 text-violet-700 text-xs max-w-[200px] truncate"
                          key={idx}
                          variant="secondary"
                        >
                          {label}
                        </Badge>
                      ))}
                      {exclusionLabels.length > 2 && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge className="bg-slate-100 text-slate-600 text-xs cursor-help" variant="secondary">
                                +{exclusionLabels.length - 2}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="flex flex-col gap-1">
                                {exclusionLabels.slice(2).map((label, idx) => (
                                  <p className="text-xs" key={idx}>
                                    {label}
                                  </p>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
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
