'use client'

import { Ban, Check } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrency, formatDateTime } from '@/utils/format/number'

export interface SettlementOrder {
  address: string
  cost: number
  customerName: string
  excludedFromEmail?: boolean
  excludedReason?: string
  id: number
  optionName: string
  productName: string
  quantity: number
  sabangnetOrderNumber: string
  sentAt: string
  shippingCost: number
  totalCost: number
}

interface SettlementTableProps {
  isLoading?: boolean
  orders: SettlementOrder[]
}

export function SettlementTable({ orders, isLoading }: SettlementTableProps) {
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
      <CardContent className="p-0">
        <div className="overflow-auto max-h-[500px] overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-transparent">
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
                {orders.map((order) => (
                  <TableRow
                    className={`hover:bg-slate-50 ${order.excludedFromEmail ? 'bg-amber-50/50' : ''}`}
                    key={order.id}
                  >
                    <TableCell className="font-mono text-sm text-slate-700">{order.sabangnetOrderNumber}</TableCell>
                    <TableCell className="text-sm text-slate-600">{formatDateTime(order.sentAt)}</TableCell>
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
                          <Check className="h-3 w-3" />
                          발송
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TooltipProvider>
              {orders.length === 0 && (
                <TableRow>
                  <TableCell className="h-32 text-center text-slate-500" colSpan={11}>
                    조회된 발주 내역이 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
