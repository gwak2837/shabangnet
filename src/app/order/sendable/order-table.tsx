'use client'

import { Download, Eye, Loader2, Mail, MoreHorizontal } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { shouldToggleRowSelection, TableSelectionCell, TableSelectionHeadCell } from '@/components/ui/table-selection'
import { formatRelativeTime } from '@/utils/format/date'
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/utils/format/number'

import type { OrderBatch } from '../hook'

interface OrderTableProps {
  batches: OrderBatch[]
  fetchNextPage?: () => void
  hasNextPage: boolean
  isFetchingNextPage?: boolean
  onDownload?: (batch: OrderBatch) => void
  onPreview: (batch: OrderBatch) => void
  onSelectedManufacturerIdsChange: (manufacturerIds: number[]) => void
  onSendEmail: (batch: OrderBatch) => void
  selectedManufacturerIds: number[]
}

export function OrderTable({
  batches,
  onSendEmail,
  onPreview,
  onDownload,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  selectedManufacturerIds,
  onSelectedManufacturerIdsChange,
}: OrderTableProps) {
  const visibleManufacturerIds = batches.map((b) => b.manufacturerId)
  const visibleManufacturerIdSet = new Set(visibleManufacturerIds)
  const effectiveSelectedManufacturerIds = selectedManufacturerIds.filter((id) => visibleManufacturerIdSet.has(id))
  const effectiveSelectedManufacturerIdSet = new Set(effectiveSelectedManufacturerIds)
  const isAllSelected =
    visibleManufacturerIds.length > 0 &&
    visibleManufacturerIds.every((id) => effectiveSelectedManufacturerIdSet.has(id))
  const isSomeSelected =
    visibleManufacturerIds.some((id) => effectiveSelectedManufacturerIdSet.has(id)) && !isAllSelected

  function handleSelectAll(checked: boolean) {
    if (checked) {
      onSelectedManufacturerIdsChange(visibleManufacturerIds)
    } else {
      onSelectedManufacturerIdsChange([])
    }
  }

  function handleSelectBatch(manufacturerId: number, checked: boolean) {
    if (checked) {
      if (selectedManufacturerIds.includes(manufacturerId)) {
        return
      }
      onSelectedManufacturerIdsChange([...selectedManufacturerIds, manufacturerId])
    } else {
      onSelectedManufacturerIdsChange(selectedManufacturerIds.filter((id) => id !== manufacturerId))
    }
  }

  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0">
        <Table className="min-w-max">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableSelectionHeadCell
                aria-label="전체 선택"
                checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                onCheckedChange={handleSelectAll}
              />
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
                    selected={selectedManufacturerIds.includes(batch.manufacturerId)}
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
  const hasEmail = batch.emails.length > 0

  return (
    <TableRow
      aria-selected={selected}
      className="hover:bg-slate-50 transition aria-selected:bg-muted/50 cursor-pointer"
      onClick={(e) => {
        if (!shouldToggleRowSelection(e)) {
          return
        }
        onSelectBatch(batch.manufacturerId, !selected)
      }}
    >
      <TableSelectionCell
        aria-label={`${batch.manufacturerName} 선택`}
        checked={selected}
        onCheckedChange={(checked) => onSelectBatch(batch.manufacturerId, checked)}
      />

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
          <span className="text-sm text-slate-600">{batch.emails.join(', ')}</span>
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
