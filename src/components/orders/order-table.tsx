'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel, type OrderBatch } from '@/lib/mock-data'
import { CheckCircle2, Download, Eye, Mail, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

interface OrderTableProps {
  batches: OrderBatch[]
  onSendEmail: (batch: OrderBatch) => void
  onPreview: (batch: OrderBatch) => void
  onBatchSend?: (batches: OrderBatch[]) => void
}

export function OrderTable({ batches, onSendEmail, onPreview, onBatchSend }: OrderTableProps) {
  const [selectedBatches, setSelectedBatches] = useState<string[]>([])
  const isAllSelected = batches.length > 0 && selectedBatches.length === batches.length
  const isSomeSelected = selectedBatches.length > 0 && !isAllSelected

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedBatches(batches.map((b) => b.manufacturerId))
    } else {
      setSelectedBatches([])
    }
  }

  function handleSelectBatch(manufacturerId: string, checked: boolean) {
    if (checked) {
      setSelectedBatches([...selectedBatches, manufacturerId])
    } else {
      setSelectedBatches(selectedBatches.filter((id) => id !== manufacturerId))
    }
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        {/* Bulk Actions */}
        {selectedBatches.length > 0 && (
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
            <span className="text-sm font-medium text-slate-700">{selectedBatches.length}개 선택됨</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                일괄 다운로드
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const selectedBatchData = batches.filter((b) => selectedBatches.includes(b.manufacturerId))
                  onBatchSend?.(selectedBatchData)
                }}
              >
                <Mail className="h-4 w-4" />
                일괄 발송
              </Button>
            </div>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="전체 선택"
                  className={isSomeSelected ? 'opacity-50' : ''}
                />
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                주문 수
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                총 금액
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">이메일</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상태</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">발송 시간</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.map((batch) => (
              <TableRow key={batch.manufacturerId} className="hover:bg-slate-50 transition-colors">
                <TableCell>
                  <Checkbox
                    checked={selectedBatches.includes(batch.manufacturerId)}
                    onCheckedChange={(checked) => handleSelectBatch(batch.manufacturerId, checked as boolean)}
                    aria-label={`${batch.manufacturerName} 선택`}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                      {batch.manufacturerName.slice(0, 2)}
                    </div>
                    <span className="font-medium text-slate-900">{batch.manufacturerName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium text-slate-900">{batch.totalOrders}건</TableCell>
                <TableCell className="text-right font-medium text-slate-900">
                  {formatCurrency(batch.totalAmount)}
                </TableCell>
                <TableCell className="text-slate-600">{batch.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={getStatusColor(batch.status)}>
                    {getStatusLabel(batch.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">
                  {batch.lastSentAt ? formatDateTime(batch.lastSentAt) : '-'}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onPreview(batch)}>
                        <Eye className="mr-2 h-4 w-4" />
                        미리보기
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" />
                        다운로드
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onSendEmail(batch)} disabled={batch.status === 'sent'}>
                        <Mail className="mr-2 h-4 w-4" />
                        이메일 발송
                      </DropdownMenuItem>
                      {batch.status === 'sent' && (
                        <DropdownMenuItem className="text-emerald-600">
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          발송 완료됨
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
