'use client'

import { Download, Loader2, Mail, MoreHorizontal, Pencil, Phone, Search, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { Manufacturer } from '@/services/manufacturers.types'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { shouldToggleRowSelection, TableSelectionCell, TableSelectionHeadCell } from '@/components/ui/table-selection'
import { authClient } from '@/lib/auth-client'
import { formatRelativeTime } from '@/utils/format/date'
import { formatDateTime } from '@/utils/format/number'

import { ManufacturerCsvDialog } from './manufacturer-csv-dialog'

interface ManufacturerTableProps {
  fetchNextPage?: () => void
  hasNextPage?: boolean
  isFetchingNextPage?: boolean
  manufacturers: Manufacturer[]
  onEdit: (manufacturer: Manufacturer) => void
  onSearchChange: (value: string) => void
  searchQuery: string
}

import { DeleteManufacturersDialog } from './delete-manufacturers-dialog'

export function ManufacturerTable({
  manufacturers,
  onEdit,
  searchQuery,
  onSearchChange,
  fetchNextPage,
  hasNextPage = false,
  isFetchingNextPage = false,
}: ManufacturerTableProps) {
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user?.isAdmin ?? false
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)

  const visibleIds = useMemo(() => manufacturers.map((m) => m.id), [manufacturers])
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds])
  const effectiveSelectedIds = useMemo(
    () => selectedIds.filter((id) => visibleIdSet.has(id)),
    [selectedIds, visibleIdSet],
  )
  const effectiveSelectedIdSet = useMemo(() => new Set(effectiveSelectedIds), [effectiveSelectedIds])
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

  function handleDeleteSuccess() {
    setSelectedIds([])
  }

  return (
    <>
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 bg-slate-50 border-slate-200"
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="제조사명, 담당자, 이메일 검색..."
                type="search"
                value={searchQuery}
              />
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <DeleteManufacturersDialog onSuccess={handleDeleteSuccess} selectedIds={effectiveSelectedIds} />
              )}
              <Button asChild className="gap-2" variant="outline">
                <a href="/api/manufacturers/csv">
                  <Download className="h-4 w-4" />
                  CSV 다운로드
                </a>
              </Button>
              <Button className="gap-2" onClick={() => setIsCsvDialogOpen(true)}>
                <Upload className="h-4 w-4" />
                CSV 업로드
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {isAdmin && (
                  <TableSelectionHeadCell
                    aria-label="전체 선택"
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={handleSelectAll}
                  />
                )}
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">담당자</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">연락처</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                  누적 주문
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  최근 발주일
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {manufacturers.map((manufacturer) => (
                <TableRow
                  aria-selected={isAdmin ? effectiveSelectedIdSet.has(manufacturer.id) : undefined}
                  className="hover:bg-slate-50 transition-colors aria-selected:bg-muted/50 data-[admin=true]:cursor-pointer"
                  data-admin={isAdmin}
                  key={manufacturer.id}
                  onClick={(e) => {
                    if (!isAdmin) {
                      return
                    }
                    if (!shouldToggleRowSelection(e)) {
                      return
                    }
                    handleSelectItem(manufacturer.id, !effectiveSelectedIdSet.has(manufacturer.id))
                  }}
                >
                  {isAdmin && (
                    <TableSelectionCell
                      aria-label={`${manufacturer.name} 선택`}
                      checked={effectiveSelectedIdSet.has(manufacturer.id)}
                      onCheckedChange={(checked) => handleSelectItem(manufacturer.id, checked)}
                    />
                  )}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                        {manufacturer.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{manufacturer.name}</p>
                        {manufacturer.ccEmail && <p className="text-xs text-slate-500">CC: {manufacturer.ccEmail}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{manufacturer.contactName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {manufacturer.email ? (
                          manufacturer.email
                        ) : (
                          <span className="text-amber-700">이메일 미설정</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {manufacturer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-slate-100 text-slate-700 tabular-nums" variant="secondary">
                      {manufacturer.orderCount.toLocaleString()}건
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="text-sm text-slate-500"
                    title={
                      manufacturer.lastOrderDate.trim().length > 0
                        ? formatDateTime(manufacturer.lastOrderDate)
                        : undefined
                    }
                  >
                    {manufacturer.lastOrderDate.trim().length > 0 ? (
                      formatRelativeTime(manufacturer.lastOrderDate)
                    ) : (
                      <span className="text-slate-400">발주 이력이 없어요</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8 text-slate-400 hover:text-slate-600" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(manufacturer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {manufacturers.length === 0 && (
                <TableRow>
                  <TableCell className="h-32 text-center text-slate-500" colSpan={isAdmin ? 7 : 6}>
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {isFetchingNextPage ? (
            <div className="flex items-center justify-center py-4 border-t border-slate-100">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              <span className="ml-2 text-sm text-slate-500">더 불러오는 중...</span>
            </div>
          ) : null}

          <InfiniteScrollSentinel
            hasMore={hasNextPage}
            isLoading={isFetchingNextPage}
            onLoadMore={() => fetchNextPage?.()}
          />
        </CardContent>
      </Card>

      <ManufacturerCsvDialog onOpenChange={setIsCsvDialogOpen} open={isCsvDialogOpen} />
    </>
  )
}
