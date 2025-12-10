'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, FileSpreadsheet, Loader2, Store } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { FixedSizeList, type ListChildComponentProps } from 'react-window'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { authClient } from '@/lib/auth-client'
import { formatDateTime, formatFileSize } from '@/utils/format/number'

import { DeleteUploadsDialog } from './delete-uploads-dialog'
import { type UploadHistoryFilters, type UploadHistoryItem, useUploadHistory } from './use-upload-history'

// ============================================
// Types
// ============================================

interface RowData {
  isAdmin: boolean
  items: UploadHistoryItem[]
  onSelectItem: (id: number, checked: boolean) => void
  selectedIds: number[]
}

interface UploadHistoryTableProps {
  initialFilters?: UploadHistoryFilters
}

// ============================================
// Constants
// ============================================

const ROW_HEIGHT = 56
const CONTAINER_HEIGHT = 600

interface SortableHeaderProps {
  className?: string
  field: SortField
  label: string
  onSort: (field: SortField) => void
  sortBy: SortField
  sortOrder: 'asc' | 'desc'
}

// ============================================
// Component
// ============================================

type SortField = 'errorOrders' | 'fileName' | 'processedOrders' | 'totalOrders' | 'uploadedAt'

// ============================================
// Row Component
// ============================================

export function UploadHistoryTable({ initialFilters }: UploadHistoryTableProps) {
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user?.isAdmin ?? false

  // Filters state
  const [filters, setFilters] = useState<UploadHistoryFilters>(initialFilters ?? {})

  // Selection state
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  // Fetch data
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useUploadHistory({ filters })

  // Flatten pages
  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])

  const listRef = useRef<FixedSizeList<RowData>>(null)

  // Selection handlers
  const isAllSelected = items.length > 0 && selectedIds.length === items.length
  const isSomeSelected = selectedIds.length > 0 && !isAllSelected

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(items.map((item) => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectItem = useCallback((id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id])
    } else {
      setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id))
    }
  }, [])

  // Infinite scroll
  const handleItemsRendered = useCallback(
    ({ visibleStopIndex }: { visibleStopIndex: number }) => {
      if (visibleStopIndex >= items.length - 5 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage()
      }
    },
    [items.length, hasNextPage, isFetchingNextPage, fetchNextPage],
  )

  // Sort handler
  function handleSort(field: SortField) {
    setFilters((prev) => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc',
    }))
  }

  // Filter handlers
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

  // Clear selection after delete
  function handleDeleteSuccess() {
    setSelectedIds([])
  }

  const itemData: RowData = {
    items,
    selectedIds,
    onSelectItem: handleSelectItem,
    isAdmin,
  }

  const sortBy = filters.sortBy ?? 'uploadedAt'
  const sortOrder = filters.sortOrder ?? 'desc'

  return (
    <div className="space-y-4">
      {/* Filters */}
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
        {isAdmin && (
          <div className="ml-auto flex items-center gap-3">
            <DeleteUploadsDialog onSuccess={handleDeleteSuccess} selectedIds={selectedIds} />
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="border-slate-200 bg-card shadow-sm overflow-hidden">
        <CardContent className="p-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center border-b border-slate-200 bg-slate-50 h-10">
            {isAdmin && (
              <div className="w-12 shrink-0 px-4">
                <Checkbox
                  aria-label="전체 선택"
                  checked={isAllSelected}
                  className={isSomeSelected ? 'opacity-50' : ''}
                  onCheckedChange={handleSelectAll}
                />
              </div>
            )}
            <div className="w-16 shrink-0 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider">유형</div>
            <SortableHeader field="fileName" label="파일명" onSort={handleSort} sortBy={sortBy} sortOrder={sortOrder} />
            <SortableHeader
              className="w-24 text-right"
              field="totalOrders"
              label="전체"
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
            <SortableHeader
              className="w-24 text-right"
              field="processedOrders"
              label="처리됨"
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
            <SortableHeader
              className="w-24 text-right"
              field="errorOrders"
              label="오류"
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
            />
            <div className="w-24 shrink-0 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
              현재 주문
            </div>
            <div className="w-20 shrink-0 px-4 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
              크기
            </div>
            <SortableHeader
              className="w-40"
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
            <FixedSizeList
              height={Math.min(CONTAINER_HEIGHT, items.length * ROW_HEIGHT)}
              itemCount={items.length}
              itemData={itemData}
              itemSize={ROW_HEIGHT}
              onItemsRendered={handleItemsRendered}
              ref={listRef}
              width="100%"
            >
              {Row}
            </FixedSizeList>
          ) : (
            <div className="flex items-center justify-center h-32 text-slate-500">업로드 기록이 없어요.</div>
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
    </div>
  )
}

// ============================================
// Sortable Header Component
// ============================================

function Row({ index, style, data }: ListChildComponentProps<RowData>) {
  const { items, selectedIds, onSelectItem, isAdmin } = data
  const item = items[index]

  if (!item) {
    return null
  }

  const isSelected = selectedIds.includes(item.id)

  return (
    <label
      aria-selected={isSelected}
      className="flex items-center border-b border-slate-100 hover:bg-slate-50 transition aria-selected:bg-blue-50"
      style={style}
    >
      {/* Checkbox (Admin only) */}
      {isAdmin && (
        <div className="w-12 shrink-0 px-4">
          <Checkbox
            aria-label={`${item.fileName} 선택`}
            checked={isSelected}
            onCheckedChange={(checked) => onSelectItem(item.id, checked as boolean)}
          />
        </div>
      )}

      {/* File Type */}
      <div className="w-16 shrink-0 px-4">
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
      <div className="flex-1 min-w-[200px] px-4">
        <div className="truncate font-medium text-slate-900" title={item.fileName}>
          {item.fileName}
        </div>
        {item.shoppingMallName && <div className="text-xs text-slate-500">{item.shoppingMallName}</div>}
      </div>

      {/* Total Orders */}
      <div className="w-24 shrink-0 px-4 text-right font-medium text-slate-900 tabular-nums">{item.totalOrders}건</div>

      {/* Processed Orders */}
      <div className="w-24 shrink-0 px-4 text-right text-emerald-600 tabular-nums">{item.processedOrders}건</div>

      {/* Error Orders */}
      <div className="w-24 shrink-0 px-4 text-right tabular-nums">
        {item.errorOrders > 0 ? (
          <Badge className="bg-rose-100 text-rose-700" variant="secondary">
            {item.errorOrders}건
          </Badge>
        ) : (
          <span className="text-slate-400">0건</span>
        )}
      </div>

      {/* Current Order Count */}
      <div className="w-24 shrink-0 px-4 text-right text-slate-600 tabular-nums">{item.currentOrderCount}건</div>

      {/* File Size */}
      <div className="w-20 shrink-0 px-4 text-right text-sm text-slate-500">{formatFileSize(item.fileSize)}</div>

      {/* Uploaded At */}
      <div className="w-40 shrink-0 px-4 text-sm text-slate-500">{formatDateTime(item.uploadedAt)}</div>
    </label>
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
    <div className={`${className} shrink-0 px-4`}>
      <Button
        className="h-auto p-0 text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-700"
        onClick={() => onSort(field)}
        variant="ghost"
      >
        {label}
        {isActive ? (
          sortOrder === 'desc' ? (
            <ArrowDown className="ml-1 h-3 w-3" />
          ) : (
            <ArrowUp className="ml-1 h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="ml-1 h-3 w-3 opacity-50" />
        )}
      </Button>
    </div>
  )
}
