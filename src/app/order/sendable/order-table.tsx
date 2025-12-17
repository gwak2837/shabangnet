'use client'

import { Download, Eye, Loader2, Mail, MoreHorizontal } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { formatRelativeTime } from '@/utils/format/date'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/utils/format/number'

import type { OrderBatch } from '../hook'

interface OrderTableProps {
  batches: OrderBatch[]
  fetchNextPage?: () => void
  hasNextPage?: boolean
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

        {/* Header */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50 h-9">
          <div className="w-12 shrink-0 px-3">
            <Checkbox
              aria-label="전체 선택"
              checked={isAllSelected}
              className={isSomeSelected ? 'opacity-50' : ''}
              onCheckedChange={handleSelectAll}
            />
          </div>
          <div className="flex-1 min-w-[200px] px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
            제조사
          </div>
          <div className="w-24 shrink-0 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
            주문 수
          </div>
          <div className="w-32 shrink-0 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
            총 금액
          </div>
          <div className="flex-1 min-w-[200px] px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
            이메일
          </div>
          <div className="w-24 shrink-0 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">상태</div>
          <div className="w-40 shrink-0 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">
            발송 시간
          </div>
          <div className="w-12 shrink-0 px-3" />
        </div>

        {/* List */}
        {batches.length > 0 ? (
          <div>
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

            {isFetchingNextPage ? (
              <div className="flex items-center justify-center py-4 border-t border-slate-100">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-500">더 불러오는 중...</span>
              </div>
            ) : null}

            <InfiniteScrollSentinel
              hasMore={hasNextPage ?? false}
              isLoading={isFetchingNextPage}
              onLoadMore={() => fetchNextPage?.()}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-500">주문 데이터가 없어요.</div>
        )}
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
    <label className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition">
      {/* Checkbox */}
      <div className="w-12 shrink-0 px-3">
        <Checkbox
          aria-label={`${batch.manufacturerName} 선택`}
          checked={selected}
          onCheckedChange={(checked) => onSelectBatch(batch.manufacturerId, checked as boolean)}
        />
      </div>

      {/* Manufacturer */}
      <div className="flex-1 min-w-[200px] px-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600">
            {batch.manufacturerName.slice(0, 2)}
          </div>
          <span className="text-sm font-medium text-slate-900">{batch.manufacturerName}</span>
        </div>
      </div>

      {/* Order Count */}
      <div className="w-24 shrink-0 px-3 text-right font-medium text-slate-900 tabular-nums">{batch.totalOrders}건</div>

      {/* Total Amount */}
      <div className="w-32 shrink-0 px-3 text-right font-medium text-slate-900 tabular-nums">
        {formatCurrency(batch.totalAmount)}
      </div>

      {/* Email */}
      <div className="flex-1 min-w-[200px] px-3 truncate">
        {hasEmail ? (
          <span className="text-sm text-slate-600">{batch.email}</span>
        ) : (
          <span className="text-sm text-amber-700">이메일 미설정</span>
        )}
      </div>

      {/* Status */}
      <div className="w-24 shrink-0 px-3">
        <Badge className={getStatusColor(batch.status)} variant="secondary">
          {getStatusLabel(batch.status)}
        </Badge>
      </div>

      {/* Last Sent At */}
      <div
        className="w-40 shrink-0 px-3 text-xs text-slate-500"
        title={batch.lastSentAt ? formatDateTime(batch.lastSentAt) : undefined}
      >
        {batch.lastSentAt ? formatRelativeTime(batch.lastSentAt) : '-'}
      </div>

      {/* Actions */}
      <div className="w-12 shrink-0 px-3">
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
      </div>
    </label>
  )
}
