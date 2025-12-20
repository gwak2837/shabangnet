'use client'

import { Download, FileSpreadsheet, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useSettlement } from '@/hooks/use-settlement'
import { authClient } from '@/lib/auth-client'

import type { SettlementFilters as SettlementFiltersType } from './settlement.types'

import { DeleteSettlementOrdersDialog } from './delete-settlement-orders-dialog'
import { SettlementFilters } from './settlement-filters'
import { SettlementSummary } from './settlement-summary'
import { SettlementTable } from './settlement-table'

export default function SettlementPage() {
  const { data: manufacturers = [] } = useManufacturers()
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user?.isAdmin ?? false

  // Filter states
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<number | null>(null)
  const [periodType, setPeriodType] = useState<'month' | 'range'>('month')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Search trigger
  const [searchParams, setSearchParams] = useState<SettlementFiltersType | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const handleSearch = () => {
    if (!selectedManufacturerId) return
    setSearchParams({
      manufacturerId: selectedManufacturerId,
      periodType,
      month: selectedMonth,
      startDate,
      endDate,
    })
    setSelectedIds([])
  }

  const {
    data: settlementData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useSettlement(searchParams, { limit: 50 })

  const orders = useMemo(() => settlementData?.pages.flatMap((page) => page.items) ?? [], [settlementData])
  const summary = settlementData?.pages[0]?.summary ?? {
    totalOrders: 0,
    totalQuantity: 0,
    totalCost: 0,
    totalShippingCost: 0,
    excludedOrderCount: 0,
    manufacturerName: '',
    period: '',
  }

  // Get manufacturer name
  const selectedManufacturer = manufacturers.find((m) => m.id === searchParams?.manufacturerId)

  const visibleIds = useMemo(() => orders.map((o) => o.id), [orders])
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

  const settlementCsvHref = useMemo(() => {
    if (!searchParams) return ''
    const sp = new URLSearchParams()
    sp.set('manufacturer-id', String(searchParams.manufacturerId))
    sp.set('period-type', searchParams.periodType)

    if (searchParams.periodType === 'month' && searchParams.month) {
      sp.set('month', searchParams.month)
    }

    if (searchParams.periodType === 'range') {
      if (searchParams.startDate) {
        sp.set('start-date', searchParams.startDate)
      }
      if (searchParams.endDate) {
        sp.set('end-date', searchParams.endDate)
      }
    }

    return `/api/settlement/csv?${sp.toString()}`
  }, [searchParams])

  return (
    <AppShell description="제조사별 발주 내역을 조회하고 정산서를 다운로드합니다" title="정산 관리">
      {/* Filters */}
      <div className="mb-6">
        <SettlementFilters
          endDate={endDate}
          manufacturers={manufacturers}
          onEndDateChange={setEndDate}
          onManufacturerChange={setSelectedManufacturerId}
          onMonthChange={setSelectedMonth}
          onPeriodTypeChange={setPeriodType}
          onSearch={handleSearch}
          onStartDateChange={setStartDate}
          periodType={periodType}
          selectedManufacturerId={selectedManufacturerId}
          selectedMonth={selectedMonth}
          startDate={startDate}
        />
      </div>

      {/* Results */}
      {searchParams && (
        <div className="flex flex-col gap-6">
          {/* Summary */}
          {selectedManufacturer && !isLoading && (
            <SettlementSummary
              excludedOrderCount={summary.excludedOrderCount}
              manufacturerName={summary.manufacturerName || selectedManufacturer.name}
              period={summary.period}
              totalCost={summary.totalCost}
              totalOrders={summary.totalOrders}
              totalQuantity={summary.totalQuantity}
              totalShippingCost={summary.totalShippingCost}
            />
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2">
            {isAdmin && (
              <DeleteSettlementOrdersDialog onSuccess={handleDeleteSuccess} selectedIds={visibleSelectedIds} />
            )}
            <Button asChild className="gap-2" variant="outline">
              <a href={settlementCsvHref}>
                <Download className="h-4 w-4" />
                CSV 다운로드
              </a>
            </Button>
          </div>

          {/* Table */}
          <SettlementTable
            isAdmin={isAdmin}
            isLoading={isLoading}
            onSelectAll={handleSelectAll}
            onSelectItem={handleSelectItem}
            orders={orders}
            selectedIds={visibleSelectedIds}
            selectionState={selectionState}
          />

          {isFetchingNextPage ? (
            <div className="mt-2 flex items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />더 불러오는 중...
            </div>
          ) : null}

          <InfiniteScrollSentinel
            hasMore={Boolean(hasNextPage)}
            isLoading={isFetchingNextPage}
            onLoadMore={() => fetchNextPage()}
          />
        </div>
      )}

      {/* Initial state */}
      {!searchParams && (
        <div className="flex flex-col items-center justify-center h-64 text-slate-400">
          <FileSpreadsheet className="h-16 w-16 mb-4" />
          <p className="text-lg">제조사와 기간을 선택하고 조회 버튼을 클릭하세요</p>
        </div>
      )}
    </AppShell>
  )
}
