'use client'

import { Ban, CheckCircle2 } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { shouldToggleRowSelection, TableSelectionCell, TableSelectionHeadCell } from '@/components/ui/table-selection'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatRelativeTime } from '@/utils/format/date'
import { formatCurrency, formatDateTime } from '@/utils/format/number'

import type { SettlementOrder } from './settlement.types'

interface SettlementTableProps {
  isAdmin?: boolean
  isLoading?: boolean
  onSelectAll?: (checked: boolean) => void
  onSelectItem?: (id: number, checked: boolean) => void
  orders: SettlementOrder[]
  selectedIds?: number[]
  selectionState?: 'all' | 'mixed' | 'none'
}

export function SettlementTable({
  orders,
  isLoading,
  isAdmin = false,
  onSelectAll,
  onSelectItem,
  selectedIds = [],
  selectionState = 'none',
}: SettlementTableProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {isAdmin && (
                <TableSelectionHeadCell
                  aria-label="전체 선택"
                  checked={selectionState === 'all' ? true : selectionState === 'mixed' ? 'indeterminate' : false}
                  hitAreaClassName="flex w-10 items-center justify-center"
                  onCheckedChange={(checked) => onSelectAll?.(checked)}
                />
              )}
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                사방넷주문번호
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">발주일</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품명</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">옵션</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                수량
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                원가
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                총원가
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                택배비
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">고객명</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">배송지</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                발송상태
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TooltipProvider>
              {orders.map((order) => {
                const isSelected = selectedIds.includes(order.id)

                return (
                  <TableRow
                    aria-selected={isAdmin ? isSelected : undefined}
                    className="hover:bg-slate-50 transition-colors aria-selected:[&_td:first-child]:bg-muted/50 data-[admin=true]:cursor-pointer data-[excluded=true]:bg-amber-50/50"
                    data-admin={isAdmin}
                    data-excluded={order.excludedFromEmail}
                    key={order.id}
                    onClick={(e) => {
                      if (!isAdmin) {
                        return
                      }
                      if (!shouldToggleRowSelection(e)) {
                        return
                      }
                      onSelectItem?.(order.id, !isSelected)
                    }}
                  >
                    {isAdmin && (
                      <TableSelectionCell
                        aria-label={`${order.sabangnetOrderNumber} 선택`}
                        checked={isSelected}
                        hitAreaClassName="flex w-10 items-center justify-center"
                        onCheckedChange={(checked) => onSelectItem?.(order.id, checked)}
                      />
                    )}
                    <TableCell className="font-mono text-sm text-slate-700">{order.sabangnetOrderNumber}</TableCell>
                    <TableCell className="text-sm text-slate-600" title={formatDateTime(order.createdAt)}>
                      {formatRelativeTime(order.createdAt)}
                    </TableCell>
                    <TableCell className="font-medium text-slate-900">{order.productName}</TableCell>
                    <TableCell className="text-slate-600">{order.optionName || '-'}</TableCell>
                    <TableCell className="text-right text-slate-900 tabular-nums">{order.quantity}</TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">
                      {formatCurrency(order.cost)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-900 tabular-nums">
                      {formatCurrency(order.totalCost)}
                    </TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">
                      {order.shippingCost > 0 ? formatCurrency(order.shippingCost) : '-'}
                    </TableCell>
                    <TableCell className="text-slate-700">{order.customerName}</TableCell>
                    <TableCell className="text-slate-600 max-w-[200px] truncate" title={order.address}>
                      {order.address}
                    </TableCell>
                    <TableCell className="text-center">
                      {order.excludedFromEmail ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 gap-1" variant="secondary">
                              <Ban className="h-3 w-3" />
                              제외
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">제외 사유: {order.excludedReason || '미지정'}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Badge
                          className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1"
                          variant="secondary"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          발송
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TooltipProvider>
            {orders.length === 0 && (
              <TableRow>
                <TableCell className="h-32 text-center text-slate-500" colSpan={isAdmin ? 12 : 11}>
                  조회된 발주 내역이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
