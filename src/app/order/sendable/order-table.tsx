'use client'

import { Download, Eye, Loader2, Mail, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatRelativeTime } from '@/utils/format/date'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/utils/format/number'

import type { OrderBatch } from '../hook'

interface OrderTableProps {
  batches: OrderBatch[]
  fetchNextPage?: () => void
  hasNextPage: boolean
  isFetchingNextPage?: boolean
  onBatchSend?: (batches: OrderBatch[]) => void
  onDownload?: (batch: OrderBatch) => void
  onPreview: (batch: OrderBatch) => void
  onSendEmail: (batch: OrderBatch) => void
}

export function OrderTable({
  batches,
  onSendEmail,
  onPreview,
  onBatchSend,
  onDownload,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
}: OrderTableProps) {
  const [selectedBatches, setSelectedBatches] = useState<number[]>([])
  const isAllSelected = batches.length > 0 && selectedBatches.length === batches.length
  const isSomeSelected = selectedBatches.length > 0 && !isAllSelected

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedBatches(batches.map((b) => b.manufacturerId))
    } else {
      setSelectedBatches([])
    }
  }

  function handleSelectBatch(manufacturerId: number, checked: boolean) {
    if (checked) {
      setSelectedBatches((prev) => [...prev, manufacturerId])
    } else {
      setSelectedBatches((prev) => prev.filter((id) => id !== manufacturerId))
    }
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0">
        {/* Bulk Actions */}
        {selectedBatches.length > 0 && (
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2">
            <span className="text-sm font-medium text-slate-700">{selectedBatches.length}개 선택됨</span>
            <div className="flex items-center gap-2">
              <Button
                className="gap-2"
                disabled={!onDownload}
                onClick={() => {
                  const selectedBatchData = batches.filter((b) => selectedBatches.includes(b.manufacturerId))
                  for (const batch of selectedBatchData) {
                    onDownload?.(batch)
                  }
                }}
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                일괄 다운로드
              </Button>
              <Button
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                onClick={() => {
                  const selectedBatchData = batches.filter((b) => selectedBatches.includes(b.manufacturerId))
                  onBatchSend?.(selectedBatchData)
                }}
                size="sm"
              >
                <Mail className="h-4 w-4" />
                일괄 발송
              </Button>
            </div>
          </div>
        )}

        <Table className="min-w-max">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Checkbox
                  aria-label="전체 선택"
                  checked={isAllSelected}
                  className={isSomeSelected ? 'opacity-50' : ''}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="min-w-[200px] text-xs font-medium text-slate-500 uppercase tracking-wider">
                제조사
              </TableHead>
              <TableHead className="w-24 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                주문 수
              </TableHead>
              <TableHead className="w-32 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                총 금액
              </TableHead>
              <TableHead className="min-w-[200px] text-xs font-medium text-slate-500 uppercase tracking-wider">
                이메일
              </TableHead>
              <TableHead className="w-24 text-xs font-medium text-slate-500 uppercase tracking-wider">상태</TableHead>
              <TableHead className="w-40 text-xs font-medium text-slate-500 uppercase tracking-wider">
                발송 시간
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length > 0 ? (
              <>
                {batches.map((batch) => (
                  <OrderRow
                    batch={batch}
                    key={batch.manufacturerId}
                    onDownload={onDownload}
                    onPreview={onPreview}
                    onSelectBatch={handleSelectBatch}
                    onSendEmail={onSendEmail}
                    selected={selectedBatches.includes(batch.manufacturerId)}
                  />
                ))}
              </>
            ) : (
              <TableRow>
                <TableCell className="h-32 text-center text-slate-500" colSpan={8}>
                  주문 데이터가 없어요.
                </TableCell>
              </TableRow>
            )}

            {isFetchingNextPage ? (
              <TableRow>
                <TableCell className="py-4 text-center text-slate-500" colSpan={8}>
                  <Loader2 className="mr-2 inline-block h-5 w-5 animate-spin align-middle text-slate-400" />더 불러오는
                  중...
                </TableCell>
              </TableRow>
            ) : null}

            <TableRow>
              <TableCell className="p-0" colSpan={8}>
                <InfiniteScrollSentinel
                  hasMore={hasNextPage}
                  isLoading={isFetchingNextPage}
                  onLoadMore={() => fetchNextPage?.()}
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function OrderRow({
  batch,
  selected,
  onSelectBatch,
  onPreview,
  onDownload,
  onSendEmail,
}: {
  batch: OrderBatch
  selected: boolean
  onSelectBatch: (manufacturerId: number, checked: boolean) => void
  onPreview: (batch: OrderBatch) => void
  onDownload?: (batch: OrderBatch) => void
  onSendEmail: (batch: OrderBatch) => void
}) {
  const hasEmail = batch.email.trim().length > 0

  return (
    <TableRow className="hover:bg-slate-50 transition">
      <TableCell className="w-12">
        <Checkbox
          aria-label={`${batch.manufacturerName} 선택`}
          checked={selected}
          onCheckedChange={(checked) => onSelectBatch(batch.manufacturerId, checked as boolean)}
        />
      </TableCell>

      <TableCell className="min-w-[200px] whitespace-normal">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
            {batch.manufacturerName.slice(0, 2)}
          </div>
          <span className="text-sm font-medium text-slate-900">{batch.manufacturerName}</span>
        </div>
      </TableCell>

      <TableCell className="w-24 text-right font-medium text-slate-900 tabular-nums">{batch.totalOrders}건</TableCell>
      <TableCell className="w-32 text-right font-medium text-slate-900 tabular-nums">
        {formatCurrency(batch.totalAmount)}
      </TableCell>

      <TableCell className="min-w-[200px]">
        {hasEmail ? (
          <span className="text-sm text-slate-600">{batch.email}</span>
        ) : (
          <span className="text-sm text-amber-700">이메일 미설정</span>
        )}
      </TableCell>

      <TableCell className="w-24">
        <Badge className={getStatusColor(batch.status)} variant="secondary">
          {getStatusLabel(batch.status)}
        </Badge>
      </TableCell>

      <TableCell
        className="w-40 text-xs text-slate-500"
        title={batch.lastSentAt ? formatDateTime(batch.lastSentAt) : undefined}
      >
        {batch.lastSentAt ? formatRelativeTime(batch.lastSentAt) : '-'}
      </TableCell>

      <TableCell className="w-12">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-7 w-7 text-slate-400 hover:text-slate-600"
              size="icon"
              title="작업 메뉴"
              variant="ghost"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onPreview(batch)}>
              <Eye className="mr-2 h-4 w-4" />
              미리보기
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDownload?.(batch)}>
              <Download className="mr-2 h-4 w-4" />
              다운로드
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!hasEmail} onClick={() => onSendEmail(batch)}>
              <Mail className="mr-2 h-4 w-4" />
              {hasEmail
                ? batch.status === 'sent'
                  ? '재발송'
                  : batch.status === 'error'
                    ? '재시도'
                    : '이메일 발송'
                : '이메일 설정 필요'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
