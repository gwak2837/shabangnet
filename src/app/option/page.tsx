'use client'

import { Building2, Download, Link2, Loader2, Package, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { OptionManufacturerMapping } from '@/services/option-mappings'

import { queryKeys } from '@/common/constants/query-keys'
import { AppShell } from '@/components/layout/app-shell'
import { DeleteOptionMappingsDialog } from '@/components/option-mapping/delete-option-mappings-dialog'
import { OptionMappingCsvDialog } from '@/components/option-mapping/option-mapping-csv-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useOptionMappings } from '@/hooks/use-option-mappings'
import { useServerAction } from '@/hooks/use-server-action'
import { authClient } from '@/lib/auth-client'
import { create, remove, update } from '@/services/option-mappings'

import { OptionMappingFilters } from './option-mapping-filters'
import { OptionMappingModal } from './option-mapping-modal'
import { OptionMappingTable } from './option-mapping-table'

export default function OptionMappingsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedManufacturer, setSelectedManufacturer] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [editingMapping, setEditingMapping] = useState<OptionManufacturerMapping | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user?.isAdmin ?? false

  const isUnmapped = selectedManufacturer === 'unmapped'
  const manufacturerId = selectedManufacturer === 'all' || isUnmapped ? undefined : Number(selectedManufacturer)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingMappings,
  } = useOptionMappings({
    filters: {
      manufacturerId,
      unmapped: isUnmapped ? true : undefined,
      search: searchQuery.trim().length > 0 ? searchQuery : undefined,
    },
  })
  const mappings = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data])
  const { data: manufacturers = [] } = useManufacturers()

  const [isCreating, createMapping] = useServerAction(create, {
    invalidateKeys: [queryKeys.optionMappings.all, queryKeys.orders.batches],
    onSuccess: () => {
      toast.success('연결이 추가됐어요')
      setIsModalOpen(false)
    },
    onError: (error) => toast.error(error),
  })

  const [isUpdating, updateMapping] = useServerAction(
    ({ id, data }: { id: number; data: Partial<Omit<OptionManufacturerMapping, 'createdAt' | 'id'>> }) =>
      update(id, data),
    {
      invalidateKeys: [queryKeys.optionMappings.all, queryKeys.orders.batches],
      onSuccess: () => {
        toast.success('연결이 수정됐어요')
        setIsModalOpen(false)
      },
      onError: (error) => toast.error(error),
    },
  )

  const [, deleteMapping] = useServerAction(remove, {
    invalidateKeys: [queryKeys.optionMappings.all, queryKeys.orders.batches],
    onSuccess: () => toast.success('연결이 삭제됐어요'),
    onError: (error) => toast.error(error),
  })

  const handleEdit = (mapping: OptionManufacturerMapping) => {
    setEditingMapping(mapping)
    setIsModalOpen(true)
  }

  const handleDelete = (mappingId: number) => {
    deleteMapping(mappingId)
  }

  const handleSave = (data: Omit<OptionManufacturerMapping, 'createdAt' | 'id' | 'updatedAt'>) => {
    if (editingMapping) {
      updateMapping({ id: editingMapping.id, data })
    } else {
      createMapping(data)
    }
  }

  const isSaving = isCreating || isUpdating

  const visibleIds = useMemo(() => mappings.map((m) => m.id), [mappings])

  const visibleSelectedIds = useMemo(() => {
    if (selectedIds.length === 0 || visibleIds.length === 0) {
      return []
    }

    const visibleIdSet = new Set(visibleIds)
    return selectedIds.filter((id) => visibleIdSet.has(id))
  }, [selectedIds, visibleIds])

  const selectionState = useMemo<'all' | 'mixed' | 'none'>(() => {
    if (visibleIds.length === 0) return 'none'
    const selectedCount = visibleSelectedIds.length
    if (selectedCount === 0) return 'none'
    if (selectedCount === visibleIds.length) return 'all'
    return 'mixed'
  }, [visibleIds.length, visibleSelectedIds.length])

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? visibleIds : [])
  }

  function handleSelectItem(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const visibleIdSet = new Set(visibleIds)
      const prunedPrev = prev.filter((selectedId) => visibleIdSet.has(selectedId))
      if (checked) {
        return prunedPrev.includes(id) ? prunedPrev : [...prunedPrev, id]
      }
      return prunedPrev.filter((selectedId) => selectedId !== id)
    })
  }

  function handleDeleteSuccess() {
    setSelectedIds([])
  }

  // Calculate stats
  const stats = useMemo(() => {
    const summary = data?.pages[0]?.summary
    return {
      totalMappings: summary?.totalMappings ?? 0,
      unmappedMappings: summary?.unmappedMappings ?? 0,
      uniqueProductCodes: summary?.uniqueProductCodes ?? 0,
      uniqueManufacturers: summary?.uniqueManufacturers ?? 0,
    }
  }, [data?.pages])

  if (isLoadingMappings) {
    return (
      <AppShell description="상품코드 + 옵션 조합으로 제조사를 연결해요" title="옵션 연결">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="상품코드 + 옵션 조합으로 제조사를 연결해요" title="옵션 연결">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Link2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">전체 연결</p>
              <p className="text-xl font-semibold text-slate-900">{stats.totalMappings}개</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <Link2 className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">미연결</p>
              <p className="text-xl font-semibold text-slate-900">{stats.unmappedMappings}개</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Package className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">상품 수</p>
              <p className="text-xl font-semibold text-slate-900">{stats.uniqueProductCodes}개</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Building2 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사 수</p>
              <p className="text-xl font-semibold text-slate-900">{stats.uniqueManufacturers}개</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 p-4">
        <div className="flex gap-3">
          <Link2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">옵션 연결이란?</p>
            <p className="text-blue-700">
              같은 상품코드라도 옵션에 따라 다른 제조사에서 공급되는 경우가 있어요. 옵션별로 제조사를 연결할 수 있어요.
              <br />
              주문 파일에 제조사가 있으면 그 값이 먼저 적용돼요. 제조사가 비어 있으면 옵션 연결이 적용되고, 옵션이
              없으면 상품 연결이 적용돼요.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <OptionMappingFilters
          manufacturers={manufacturers}
          onManufacturerChange={setSelectedManufacturer}
          onSearchChange={setSearchQuery}
          searchQuery={searchQuery}
          selectedManufacturer={selectedManufacturer}
        />
        <div className="flex items-center gap-2">
          {isAdmin && <DeleteOptionMappingsDialog onSuccess={handleDeleteSuccess} selectedIds={visibleSelectedIds} />}
          <Button asChild className="gap-2" variant="outline">
            <a href="/api/options/csv">
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

      {/* Mapping Table */}
      <OptionMappingTable
        isAdmin={isAdmin}
        mappings={mappings}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectItem}
        selectedIds={visibleSelectedIds}
        selectionState={selectionState}
      />

      {isFetchingNextPage ? (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />더 불러오는 중...
        </div>
      ) : null}

      <InfiniteScrollSentinel hasMore={hasNextPage} isLoading={isFetchingNextPage} onLoadMore={() => fetchNextPage()} />

      {/* Modal */}
      <OptionMappingModal
        isSaving={isSaving}
        manufacturers={manufacturers}
        mapping={editingMapping}
        onOpenChange={setIsModalOpen}
        onSave={handleSave}
        open={isModalOpen}
      />

      <OptionMappingCsvDialog onOpenChange={setIsCsvDialogOpen} open={isCsvDialogOpen} />
    </AppShell>
  )
}
