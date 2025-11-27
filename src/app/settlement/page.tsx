'use client'

import { Download, FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'

import type { SettlementFilters as SettlementFiltersType } from '@/lib/api/settlement'

import { AppShell } from '@/components/layout'
import { SettlementFilters, SettlementSummary, SettlementTable } from '@/components/settlement'
import { Button } from '@/components/ui/button'
import { useManufacturers, useSettlement } from '@/hooks'
import { api } from '@/lib/api'

export default function SettlementPage() {
  const { data: manufacturers = [] } = useManufacturers()

  // Filter states
  const [selectedManufacturerId, setSelectedManufacturerId] = useState('')
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
    manufacturerName: '',
    period: '',
  }

  // Get manufacturer name
  const selectedManufacturer = manufacturers.find((m) => m.id === searchParams?.manufacturerId)

  // Download Excel
  const handleDownload = async () => {
    if (filteredOrders.length === 0 || !searchParams) return

    const XLSX = await import('xlsx')
    const { data, summary: downloadSummary } = await api.settlement.getSettlementExcelData(searchParams)

    // Add summary row
    data.push({
      주문번호: '',
      발주일: '',
      상품명: '',
      옵션: '합계',
      수량: downloadSummary.totalQuantity,
      원가: '',
      총원가: downloadSummary.totalCost,
      고객명: '',
      배송지: '',
    } as Record<string, unknown>)

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '정산내역')

    // Set column widths
    worksheet['!cols'] = [
      { wch: 20 }, // 주문번호
      { wch: 12 }, // 발주일
      { wch: 30 }, // 상품명
      { wch: 15 }, // 옵션
      { wch: 8 }, // 수량
      { wch: 12 }, // 원가
      { wch: 12 }, // 총원가
      { wch: 10 }, // 고객명
      { wch: 40 }, // 배송지
    ]

    const fileName = `정산서_${selectedManufacturer?.name}_${summary.period.replace(/[^0-9]/g, '')}.xlsx`
    XLSX.writeFile(workbook, fileName)
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
        <div className="space-y-6">
          {/* Summary */}
          {selectedManufacturer && !isLoading && (
            <SettlementSummary
              manufacturerName={summary.manufacturerName || selectedManufacturer.name}
              period={summary.period}
              totalCost={summary.totalCost}
              totalOrders={summary.totalOrders}
              totalQuantity={summary.totalQuantity}
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
