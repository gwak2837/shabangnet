'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDateTime } from '@/lib/mock-data'

export interface SettlementOrder {
  address: string
  cost: number
  customerName: string
  id: string
  optionName: string
  orderNumber: string
  productName: string
  quantity: number
  sentAt: string
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
        <div className="overflow-auto max-h-[500px]">
          <Table>
            <TableHeader className="sticky top-0 bg-card z-10">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">주문번호</TableHead>
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
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">고객명</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">배송지</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow className="hover:bg-slate-50" key={order.id}>
                  <TableCell className="font-mono text-sm text-slate-700">{order.orderNumber}</TableCell>
                  <TableCell className="text-sm text-slate-600">{formatDateTime(order.sentAt)}</TableCell>
                  <TableCell className="font-medium text-slate-900">{order.productName}</TableCell>
                  <TableCell className="text-slate-600">{order.optionName || '-'}</TableCell>
                  <TableCell className="text-right text-slate-900">{order.quantity}</TableCell>
                  <TableCell className="text-right text-slate-700">{formatCurrency(order.cost)}</TableCell>
                  <TableCell className="text-right font-medium text-slate-900">
                    {formatCurrency(order.totalCost)}
                  </TableCell>
                  <TableCell className="text-slate-700">{order.customerName}</TableCell>
                  <TableCell className="text-slate-600 max-w-[200px] truncate" title={order.address}>
                    {order.address}
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell className="h-32 text-center text-slate-500" colSpan={9}>
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
