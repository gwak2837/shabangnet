'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { manufacturers } from '@/lib/mock-data'
import { Calendar, X } from 'lucide-react'

interface LogFiltersProps {
  dateFrom: string
  dateTo: string
  status: string
  manufacturer: string
  onDateFromChange: (value: string) => void
  onDateToChange: (value: string) => void
  onStatusChange: (value: string) => void
  onManufacturerChange: (value: string) => void
}

export function LogFilters({
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

  const handleClear = () => {
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
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-[150px] pl-9 bg-white border-slate-200"
          />
        </div>
        <span className="text-slate-400">~</span>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-[150px] pl-9 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Status Select */}
      <Select value={status} onValueChange={onStatusChange}>
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
      <Select value={manufacturer} onValueChange={onManufacturerChange}>
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
        <Button variant="ghost" size="sm" onClick={handleClear} className="gap-1 text-slate-500 hover:text-slate-700">
          <X className="h-4 w-4" />
          필터 초기화
        </Button>
      )}
    </div>
  )
}
