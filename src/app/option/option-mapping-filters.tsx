'use client'

import { Search, X } from 'lucide-react'

import type { Manufacturer } from '@/services/manufacturers.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface OptionMappingFiltersProps {
  manufacturers: Manufacturer[]
  onManufacturerChange: (value: string) => void
  onSearchChange: (value: string) => void
  searchQuery: string
  selectedManufacturer: string
}

export function OptionMappingFilters({
  manufacturers,
  searchQuery,
  onSearchChange,
  selectedManufacturer,
  onManufacturerChange,
}: OptionMappingFiltersProps) {
  const hasActiveFilters = searchQuery || selectedManufacturer !== 'all'

  function handleClear() {
    onSearchChange('')
    onManufacturerChange('all')
  }

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9 bg-background border-slate-200"
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="상품코드, 옵션명 검색..."
          type="search"
          value={searchQuery}
        />
      </div>

      {/* Manufacturer Filter */}
      <Select onValueChange={onManufacturerChange} value={selectedManufacturer}>
        <SelectTrigger className="w-[180px] bg-background border-slate-200">
          <SelectValue placeholder="제조사 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 제조사</SelectItem>
          {manufacturers.map((m) => (
            <SelectItem key={m.id} value={m.id.toString()}>
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
