'use client'

import { Download, Eye, Loader2, Mail, MoreHorizontal } from 'lucide-react'
import { useCallback, useRef, useState } from 'react'
import { FixedSizeList, type ListChildComponentProps } from 'react-window'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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

interface RowData {
  batches: OrderBatch[]
  onDownload?: (batch: OrderBatch) => void
  onPreview: (batch: OrderBatch) => void
  onSelectBatch: (manufacturerId: number, checked: boolean) => void
  onSendEmail: (batch: OrderBatch) => void
  selectedBatches: number[]
}

const ROW_HEIGHT = 72
const CONTAINER_HEIGHT = 600

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
  const listRef = useRef<FixedSizeList<RowData>>(null)
  const isAllSelected = batches.length > 0 && selectedBatches.length === batches.length
  const isSomeSelected = selectedBatches.length > 0 && !isAllSelected

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedBatches(batches.map((b) => b.manufacturerId))
    } else {
      setSelectedBatches([])
    }
  }

  const handleSelectBatch = useCallback((manufacturerId: number, checked: boolean) => {
    if (checked) {
      setSelectedBatches((prev) => [...prev, manufacturerId])
    } else {
      setSelectedBatches((prev) => prev.filter((id) => id !== manufacturerId))
    }
  }, [])

  // Infinite scroll: load more when near the end
  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      if (visibleStopIndex >= batches.length - 5 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage?.()
      }
    },
    [batches.length, hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  const itemData: RowData = {
    batches,
    selectedBatches,
    onSelectBatch: handleSelectBatch,
    onPreview,
    onDownload,
    onSendEmail,
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0 overflow-hidden">
        {/* Bulk Actions */}
        {selectedBatches.length > 0 && (
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
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
        <div className="flex items-center border-b border-slate-200 bg-slate-50 h-10">
          <div className="w-12 shrink-0 px-4">
            <Checkbox
              aria-label="전체 선택"
              checked={isAllSelected}
              className={isSomeSelected ? 'opacity-50' : ''}
              onCheckedChange={handleSelectAll}
            />
          </div>
          <div className="flex-1 min-w-[200px] px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
            제조사
          </div>
          <div className="w-24 shrink-0 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
            주문 수
          </div>
          <div className="w-32 shrink-0 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
            총 금액
          </div>
          <div className="flex-1 min-w-[200px] px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
            이메일
          </div>
          <div className="w-24 shrink-0 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">상태</div>
          <div className="w-40 shrink-0 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">
            발송 시간
          </div>
          <div className="w-12 shrink-0 px-4" />
        </div>

        {/* Virtual List */}
        {batches.length > 0 ? (
          <FixedSizeList
            height={Math.min(CONTAINER_HEIGHT, batches.length * ROW_HEIGHT)}
            itemCount={batches.length}
            itemData={itemData}
            itemSize={ROW_HEIGHT}
            onItemsRendered={handleItemsRendered}
            ref={listRef}
            width="100%"
          >
            {Row}
          </FixedSizeList>
        ) : (
          <div className="flex items-center justify-center h-32 text-slate-500">주문 데이터가 없습니다.</div>
        )}

        {/* Loading indicator for next page */}
        {isFetchingNextPage && (
          <div className="flex items-center justify-center py-4 border-t border-slate-100">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-500">더 불러오는 중...</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const { batches, selectedBatches, onSelectBatch, onPreview, onDownload, onSendEmail } = data
  const batch = batches[index]

  if (!batch) {
    return null
  }

  const hasEmail = batch.email.trim().length > 0

  return (
    <label className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition" style={style}>
      {/* Checkbox */}
      <div className="w-12 shrink-0 px-4">
        <Checkbox
          aria-label={`${batch.manufacturerName} 선택`}
          checked={selectedBatches.includes(batch.manufacturerId)}
          onCheckedChange={(checked) => onSelectBatch(batch.manufacturerId, checked as boolean)}
        />
      </div>

      {/* Manufacturer */}
      <div className="flex-1 min-w-[200px] px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
            {batch.manufacturerName.slice(0, 2)}
          </div>
          <span className="font-medium text-slate-900">{batch.manufacturerName}</span>
        </div>
      </div>

      {/* Order Count */}
      <div className="w-24 shrink-0 px-4 text-right font-medium text-slate-900 tabular-nums">{batch.totalOrders}건</div>

      {/* Total Amount */}
      <div className="w-32 shrink-0 px-4 text-right font-medium text-slate-900 tabular-nums">
        {formatCurrency(batch.totalAmount)}
      </div>

      {/* Email */}
      <div className="flex-1 min-w-[200px] px-4 truncate">
        {hasEmail ? (
          <span className="text-slate-600">{batch.email}</span>
        ) : (
          <span className="text-amber-700">이메일 미설정</span>
        )}
      </div>

      {/* Status */}
      <div className="w-24 shrink-0 px-4">
        <Badge className={getStatusColor(batch.status)} variant="secondary">
          {getStatusLabel(batch.status)}
        </Badge>
      </div>

      {/* Last Sent At */}
      <div
        className="w-40 shrink-0 px-4 text-sm text-slate-500"
        title={batch.lastSentAt ? formatDateTime(batch.lastSentAt) : undefined}
      >
        {batch.lastSentAt ? formatRelativeTime(batch.lastSentAt) : '-'}
      </div>

      {/* Actions */}
      <div className="w-12 shrink-0 px-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="h-8 w-8 text-slate-400 hover:text-slate-600"
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
