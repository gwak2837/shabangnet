'use client'

import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'

import type { SettlementFilters as SettlementFiltersType } from '@/services/settlement'

import { AppShell } from '@/components/layout/app-shell'
import { SettlementFilters } from '@/components/settlement/settlement-filters'
import { SettlementSummary } from '@/components/settlement/settlement-summary'
import { SettlementTable } from '@/components/settlement/settlement-table'
import { Button } from '@/components/ui/button'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useSettlement } from '@/hooks/use-settlement'
import { downloadExcel } from '@/lib/excel-client'
import { getSettlementExcelData } from '@/services/settlement'

export default function SettlementPage() {
  const { data: manufacturers = [] } = useManufacturers()

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

  const handleSearch = () => {
    if (!selectedManufacturerId) return
    setSearchParams({
      manufacturerId: selectedManufacturerId,
      periodType,
      month: selectedMonth,
      startDate,
      endDate,
    })
  }

  // Use API hook
  const { data: settlementData, isLoading } = useSettlement(searchParams)

  const filteredOrders = settlementData?.orders || []
  const summary = settlementData?.summary || {
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

  // Download Excel
  const handleDownload = async () => {
    if (filteredOrders.length === 0 || !searchParams) return

    const { data, summary: downloadSummary } = await getSettlementExcelData(searchParams)

    // Add summary row
    data.push({
      주문번호: '',
      발주일: '',
      상품명: '',
      옵션: '합계',
      수량: downloadSummary.totalQuantity,
      원가: '',
      총원가: downloadSummary.totalCost,
      택배비: downloadSummary.totalShippingCost,
      고객명: '',
      배송지: '',
    } as Record<string, unknown>)

    const fileName = `정산서_${selectedManufacturer?.name}_${summary.period.replace(/[^0-9]/g, '')}.xlsx`
    await downloadExcel(data, {
      fileName,
      sheetName: '정산내역',
      columnWidths: [20, 12, 30, 15, 8, 12, 12, 12, 10, 40],
    })
  }

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

          {/* Download Button */}
          {filteredOrders.length > 0 && !isLoading && (
            <div className="flex justify-end">
              <Button className="gap-2" onClick={handleDownload}>
                <Download className="h-4 w-4" />
                엑셀 다운로드
              </Button>
            </div>
          )}

          {/* Table */}
          <SettlementTable isLoading={isLoading} orders={filteredOrders} />
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
