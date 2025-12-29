'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, FileSpreadsheet, Loader2, Store } from 'lucide-react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { shouldToggleRowSelection, TableSelectionCell, TableSelectionHeadCell } from '@/components/ui/table-selection'
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
  const visibleIds = items.map((item) => item.id)
  const visibleIdSet = new Set(visibleIds)
  const effectiveSelectedIds = selectedIds.filter((id) => visibleIdSet.has(id))
  const effectiveSelectedIdSet = new Set(effectiveSelectedIds)
  const isAllSelected = visibleIds.length > 0 && visibleIds.every((id) => effectiveSelectedIdSet.has(id))
  const isSomeSelected = visibleIds.some((id) => effectiveSelectedIdSet.has(id)) && !isAllSelected

  function handleSelectAll(checked: boolean) {
    if (checked) {
      setSelectedIds(visibleIds)
    } else {
      setSelectedIds([])
    }
  }

  function handleSelectItem(id: number, checked: boolean) {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
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
        {isAdmin && effectiveSelectedIds.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <DeleteUploadsDialog onSuccess={handleDeleteSuccess} selectedIds={effectiveSelectedIds} />
          </div>
        )}
      </div>

      {/* Table */}
      <Card className="border-slate-200 bg-card shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table className="min-w-max">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {isAdmin && (
                  <TableSelectionHeadCell
                    aria-label="전체 선택"
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                  />
                )}
                <TableHead className="w-14 text-xs font-medium text-slate-500 uppercase tracking-wider">유형</TableHead>
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
                <TableHead className="w-20 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                  저장
                </TableHead>
                <TableHead className="w-20 text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                  크기
                </TableHead>
                <SortableHeader
                  className="w-36 text-right"
                  field="uploadedAt"
                  label="업로드 시간"
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell className="h-32 text-center text-slate-500" colSpan={isAdmin ? 9 : 8}>
                    <Loader2 className="mr-2 inline-block h-5 w-5 animate-spin align-middle" />
                    불러오는 중...
                  </TableCell>
                </TableRow>
              ) : items.length > 0 ? (
                <>
                  {items.map((item) => (
                    <UploadHistoryRow
                      isAdmin={isAdmin}
                      isSelected={effectiveSelectedIdSet.has(item.id)}
                      item={item}
                      key={item.id}
                      onSelectItem={handleSelectItem}
                    />
                  ))}
                </>
              ) : (
                <TableRow>
                  <TableCell className="h-32 text-center text-slate-500" colSpan={isAdmin ? 9 : 8}>
                    업로드 기록이 없어요.
                  </TableCell>
                </TableRow>
              )}

              {isFetchingNextPage ? (
                <TableRow>
                  <TableCell className="py-4 text-center text-slate-500" colSpan={isAdmin ? 9 : 8}>
                    <Loader2 className="mr-2 inline-block h-5 w-5 animate-spin align-middle text-slate-400" />더
                    불러오는 중...
                  </TableCell>
                </TableRow>
              ) : null}

              <TableRow>
                <TableCell className="p-0" colSpan={isAdmin ? 9 : 8}>
                  <InfiniteScrollSentinel
                    hasMore={hasNextPage}
                    isLoading={isFetchingNextPage}
                    onLoadMore={() => fetchNextPage()}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function SortableHeader({ field, label, sortBy, sortOrder, onSort, className = 'min-w-[200px]' }: SortableHeaderProps) {
  const isActive = sortBy === field
  const isRightAligned = className.includes('text-right')

  return (
    <TableHead className={className}>
      <Button
        className={`h-auto w-full p-2 py-1 text-xs font-medium text-slate-500 uppercase tracking-wider hover:text-slate-700 ${
          isRightAligned ? 'justify-end' : 'justify-start'
        }`}
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
    </TableHead>
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
  return (
    <TableRow
      aria-selected={isSelected}
      className={`hover:bg-slate-50 transition aria-selected:bg-muted/50 ${isAdmin ? 'cursor-pointer' : ''}`}
      onClick={(e) => {
        if (!isAdmin) {
          return
        }
        if (!shouldToggleRowSelection(e)) {
          return
        }
        onSelectItem(item.id, !isSelected)
      }}
    >
      {isAdmin && (
        <TableSelectionCell
          aria-label={`${item.fileName} 선택`}
          checked={isSelected}
          onCheckedChange={(checked) => onSelectItem(item.id, checked)}
        />
      )}

      <TableCell className="w-14">
        {item.fileType === 'sabangnet' ? (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100" title="사방넷">
            <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100" title="쇼핑몰">
            <Store className="h-4 w-4 text-violet-600" />
          </div>
        )}
      </TableCell>

      <TableCell className="min-w-[200px] whitespace-normal">
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-900" title={item.fileName}>
            {item.fileName}
          </div>
          {item.shoppingMallName && <div className="text-xs text-slate-500">{item.shoppingMallName}</div>}
        </div>
      </TableCell>

      <TableCell className="w-20 text-right font-medium text-slate-900 tabular-nums">{item.totalOrders}건</TableCell>
      <TableCell className="w-20 text-right text-slate-600 tabular-nums">{item.processedOrders}건</TableCell>
      <TableCell className="w-20 text-right tabular-nums">
        {item.errorOrders > 0 ? (
          <Badge className="bg-rose-100 text-rose-700" variant="secondary">
            {item.errorOrders}건
          </Badge>
        ) : (
          <span className="text-slate-400">0건</span>
        )}
      </TableCell>
      <TableCell className="w-20 text-right tabular-nums">
        {item.fileType === 'sabangnet' ? (
          <span className="text-emerald-600">{item.currentOrderCount}건</span>
        ) : (
          <span className="text-slate-300">-</span>
        )}
      </TableCell>
      <TableCell className="w-20 text-right text-sm text-slate-500">{formatFileSize(item.fileSize)}</TableCell>
      <TableCell className="w-36 text-right text-sm text-slate-500" title={formatDateTime(item.uploadedAt)}>
        {formatRelativeTime(item.uploadedAt)}
      </TableCell>
    </TableRow>
  )
}
