'use client'

import { Calendar, X } from 'lucide-react'

import type { Manufacturer } from '@/lib/mock-data'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LogFiltersProps {
  dateFrom: string
  dateTo: string
  manufacturer: string
  manufacturers: Manufacturer[]
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onManufacturerChange: (value: string) => void
  onStatusChange: (value: string) => void
  status: string
}

export function LogFilters({
  manufacturers,
  dateFrom,
  dateTo,
  status,
  manufacturer,
  onDateFromChange,
  onDateToChange,
  onStatusChange,
  onManufacturerChange,
}: LogFiltersProps) {
  const hasActiveFilters = dateFrom || dateTo || status !== 'all' || manufacturer !== 'all'

  function handleClear() {
    onDateFromChange('')
    onDateToChange('')
    onStatusChange('all')
    onManufacturerChange('all')
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Date Range */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="w-[150px] pl-9 bg-white border-slate-200"
            onChange={(e) => onDateFromChange(e.target.value)}
            type="date"
            value={dateFrom}
          />
        </div>
        <span className="text-slate-400">~</span>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="w-[150px] pl-9 bg-white border-slate-200"
            onChange={(e) => onDateToChange(e.target.value)}
            type="date"
            value={dateTo}
          />
        </div>
      </div>

      {/* Status Select */}
      <Select onValueChange={onStatusChange} value={status}>
        <SelectTrigger className="w-[140px] bg-white border-slate-200">
          <SelectValue placeholder="상태 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 상태</SelectItem>
          <SelectItem value="success">성공</SelectItem>
          <SelectItem value="failed">실패</SelectItem>
        </SelectContent>
      </Select>

      {/* Manufacturer Select */}
      <Select onValueChange={onManufacturerChange} value={manufacturer}>
        <SelectTrigger className="w-[160px] bg-white border-slate-200">
          <SelectValue placeholder="제조사 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 제조사</SelectItem>
          {manufacturers.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button className="gap-1 text-slate-500 hover:text-slate-700" onClick={handleClear} size="sm" variant="ghost">
          <X className="h-4 w-4" />
          필터 초기화
        </Button>
      )}
    </div>
  )
}
