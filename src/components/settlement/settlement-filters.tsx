'use client'

import { Calendar, Search } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Manufacturer } from '@/lib/mock-data'

interface SettlementFiltersProps {
  endDate: string
  manufacturers: Manufacturer[]
  onEndDateChange: (date: string) => void
  onManufacturerChange: (id: string) => void
  onMonthChange: (month: string) => void
  onPeriodTypeChange: (type: 'month' | 'range') => void
  onSearch: () => void
  onStartDateChange: (date: string) => void
  periodType: 'month' | 'range'
  selectedManufacturerId: string
  selectedMonth: string // YYYY-MM format
  startDate: string // YYYY-MM-DD format
}

export function SettlementFilters({
  manufacturers,
  selectedManufacturerId,
  onManufacturerChange,
  periodType,
  onPeriodTypeChange,
  selectedMonth,
  onMonthChange,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onSearch,
}: SettlementFiltersProps) {
  return (
    <div className="space-y-4 bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
      {/* Manufacturer Select */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">제조사 선택</Label>
        <Select onValueChange={onManufacturerChange} value={selectedManufacturerId}>
          <SelectTrigger className="w-full md:w-[300px]">
            <SelectValue placeholder="제조사를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {manufacturers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period Selection */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-700">기간 선택</Label>

        <Tabs onValueChange={(v) => onPeriodTypeChange(v as 'month' | 'range')} value={periodType}>
          <TabsList className="grid w-full max-w-[300px] grid-cols-2">
            <TabsTrigger value="month">월 선택</TabsTrigger>
            <TabsTrigger value="range">기간 지정</TabsTrigger>
          </TabsList>
        </Tabs>

        {periodType === 'month' ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <Input
              className="w-[200px]"
              onChange={(e) => onMonthChange(e.target.value)}
              type="month"
              value={selectedMonth}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="h-4 w-4 text-slate-400" />
            <Input
              className="w-[160px]"
              onChange={(e) => onStartDateChange(e.target.value)}
              type="date"
              value={startDate}
            />
            <span className="text-slate-500">~</span>
            <Input
              className="w-[160px]"
              onChange={(e) => onEndDateChange(e.target.value)}
              type="date"
              value={endDate}
            />
          </div>
        )}
      </div>

      {/* Search Button */}
      <Button className="gap-2" disabled={!selectedManufacturerId} onClick={onSearch}>
        <Search className="h-4 w-4" />
        조회
      </Button>
    </div>
  )
}
