'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, Download, FileSpreadsheet, Loader2, Store } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { downloadShoppingMallExcel } from '@/app/upload/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { authClient } from '@/lib/auth-client'
import { formatRelativeTime } from '@/utils/format/date'
import { formatDateTime, formatFileSize } from '@/utils/format/number'

import { DeleteUploadsDialog } from './delete-uploads-dialog'
import { type UploadHistoryFilters, type UploadHistoryItem, useUploadHistory } from './use-upload-history'

interface SortableHeaderProps {
  className?: string
  field: SortField
  label: string
  onSort: (field: SortField) => void
  sortBy: SortField
  sortOrder: 'asc' | 'desc'
}

type SortField = 'errorOrders' | 'fileName' | 'processedOrders' | 'totalOrders' | 'uploadedAt'

interface UploadHistoryTableProps {
  initialFilters?: UploadHistoryFilters
}

// ============================================
// Row Component
// ============================================

export function UploadHistoryTable({ initialFilters }: UploadHistoryTableProps) {
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user?.isAdmin ?? false
  const [filters, setFilters] = useState<UploadHistoryFilters>(initialFilters ?? {})
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useUploadHistory({ filters })
  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])
  const isAllSelected = items.length > 0 && selectedIds.length === items.length
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(items.map((item) => item.id))
    } else {
      setSelectedIds([])
    }
  }

  function handleSelectItem(id: number, checked: boolean) {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
    }
  }

  function handleSort(field: SortField) {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }))
  }

  function handleFileTypeChange(value: string) {
    setFilters((prev) => ({
      ...prev,
      fileType: value === 'all' ? undefined : (value as 'sabangnet' | 'shopping_mall'),
    }))
  }

  function handleStartDateChange(value: string) {
    setFilters((prev) => ({
      ...prev,
      startDate: value || undefined,
    }))
  }

  function handleEndDateChange(value: string) {
    setFilters((prev) => ({
      ...prev,
      endDate: value || undefined,
    }))
  }

  function handleDeleteSuccess() {
    setSelectedIds([])
  }

  const sortBy = filters.sortBy ?? 'uploadedAt'
  const sortOrder = filters.sortOrder ?? 'desc'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="file-type">
            파일 유형
          </label>
          <select
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="file-type"
            onChange={(e) => handleFileTypeChange(e.target.value)}
            value={filters.fileType ?? 'all'}
          >
            <option value="all">전체</option>
            <option value="sabangnet">사방넷</option>
            <option value="shopping_mall">쇼핑몰</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="start-date">
            시작일
          </label>
          <input
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="start-date"
            onChange={(e) => handleStartDateChange(e.target.value)}
            type="date"
            value={filters.startDate ?? ''}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-slate-700" htmlFor="end-date">
            종료일
          </label>
          <input
            className="rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            id="end-date"
            onChange={(e) => handleEndDateChange(e.target.value)}
            type="date"
            value={filters.endDate ?? ''}
          />
        </div>

        {/* Admin Delete Button */}
        {isAdmin && selectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <DeleteUploadsDialog onSuccess={handleDeleteSuccess} selectedIds={selectedIds} />
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="border-slate-200 bg-card shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-x-auto">
          <div className="w-max min-w-full">
            {/* Header */}
            <div className="flex items-center border-b border-slate-200 bg-slate-50 h-10">
              {isAdmin && (
                <div className="w-10 shrink-0 px-3">
                  <Checkbox
                    aria-label="전체 선택"
                    checked={isAllSelected}
                    className={isSomeSelected ? 'opacity-50' : ''}
                    onCheckedChange={handleSelectAll}
                  />
                </div>
              )}
              <div className="w-14 shrink-0 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider">유형</div>
              <SortableHeader
                field="fileName"
                label="파일명"
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
              <SortableHeader
                className="w-20 text-right"
                field="totalOrders"
                label="전체"
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
              <SortableHeader
                className="w-20 text-right"
                field="processedOrders"
                label="유효"
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
              <SortableHeader
                className="w-20 text-right"
                field="errorOrders"
                label="오류"
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
              <div className="w-20 shrink-0 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                처리
              </div>
              <div className="w-20 shrink-0 px-3 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                크기
              </div>
              <div className="w-20 shrink-0 px-2 text-xs font-medium text-slate-500 uppercase tracking-wider text-center">
                다운로드
              </div>
              <SortableHeader
                className="w-36 text-right"
                field="uploadedAt"
                label="업로드 시간"
                onSort={handleSort}
                sortBy={sortBy}
                sortOrder={sortOrder}
              />
            </div>

            {/* Virtual List */}
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-slate-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                불러오는 중...
              </div>
            ) : items.length > 0 ? (
              <div className="overflow-x-hidden">
                {items.map((item) => (
                  <UploadHistoryRow
                    isAdmin={isAdmin}
                    isSelected={selectedIds.includes(item.id)}
                    item={item}
                    key={item.id}
                    onSelectItem={handleSelectItem}
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
                  onLoadMore={() => fetchNextPage()}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-500">업로드 기록이 없어요.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SortableHeader({
  field,
  label,
  sortBy,
  sortOrder,
  onSort,
  className = 'flex-1 min-w-[200px]',
}: SortableHeaderProps) {
  const isActive = sortBy === field

  return (
    <div className={`${className} shrink-0 px-2`}>
      <Button
        className="h-auto p-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-700"
        onClick={() => onSort(field)}
        size="none"
        variant="ghost"
      >
        {label}
        {isActive ? (
          sortOrder === 'desc' ? (
            <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-50" />
        )}
      </Button>
    </div>
  )
}

function UploadHistoryRow({
  item,
  isSelected,
  isAdmin,
  onSelectItem,
}: {
  isAdmin: boolean
  isSelected: boolean
  item: UploadHistoryItem
  onSelectItem: (id: number, checked: boolean) => void
}) {
  const [isDownloading, setIsDownloading] = useState(false)

  async function handleDownload(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()

    if (item.fileType !== 'shopping_mall') {
      return
    }

    setIsDownloading(true)

    try {
      await downloadShoppingMallExcel(item.id, item.shoppingMallName ?? undefined)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '다운로드 중 오류가 발생했어요')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <label
      aria-selected={isSelected}
      className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition aria-selected:bg-blue-50"
    >
      {/* Checkbox (Admin only) */}
      {isAdmin && (
        <div className="w-10 shrink-0 px-3">
          <Checkbox
            aria-label={`${item.fileName} 선택`}
            checked={isSelected}
            onCheckedChange={(checked) => onSelectItem(item.id, checked as boolean)}
          />
        </div>
      )}

      {/* File Type */}
      <div className="w-14 shrink-0 px-3">
        {item.fileType === 'sabangnet' ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100" title="사방넷">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100" title="쇼핑몰">
            <Store className="h-4 w-4 text-violet-600" />
          </div>
        )}
      </div>

      {/* File Name */}
      <div className="flex-1 min-w-[200px] px-3">
        <div className="truncate font-medium text-slate-900" title={item.fileName}>
          {item.fileName}
        </div>
        {item.shoppingMallName && <div className="text-xs text-slate-500">{item.shoppingMallName}</div>}
      </div>

      {/* Total Orders */}
      <div className="w-20 shrink-0 px-3 text-right font-medium text-slate-900 tabular-nums">{item.totalOrders}건</div>

      {/* Processed Orders */}
      <div className="w-20 shrink-0 px-3 text-right text-slate-600 tabular-nums">{item.processedOrders}건</div>

      {/* Error Orders */}
      <div className="w-20 shrink-0 px-3 text-right tabular-nums">
        {item.errorOrders > 0 ? (
          <Badge className="bg-rose-100 text-rose-700" variant="secondary">
            {item.errorOrders}건
          </Badge>
        ) : (
          <span className="text-slate-400">0건</span>
        )}
      </div>

      {/* Current Order Count */}
      <div className="w-20 shrink-0 px-3 text-right text-emerald-600 tabular-nums">{item.currentOrderCount}건</div>

      {/* File Size */}
      <div className="w-20 shrink-0 px-3 text-right text-sm text-slate-500">{formatFileSize(item.fileSize)}</div>

      {/* Download (Shopping Mall only) */}
      <div className="w-20 shrink-0 px-2 text-center">
        {item.fileType === 'shopping_mall' ? (
          <Button
            aria-label="엑셀 다운로드"
            disabled={isDownloading}
            onClick={handleDownload}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
          </Button>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </div>

      {/* Uploaded At */}
      <div className="w-36 shrink-0 px-3 text-right text-sm text-slate-500" title={formatDateTime(item.uploadedAt)}>
        {formatRelativeTime(item.uploadedAt)}
      </div>
    </label>
  )
}
