'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Manufacturer } from '@/lib/mock-data'
import { Plus, Search, X } from 'lucide-react'

interface OptionMappingFiltersProps {
  manufacturers: Manufacturer[]
  searchQuery: string
  onSearchChange: (value: string) => void
  selectedManufacturer: string
  onManufacturerChange: (value: string) => void
  onAddNew: () => void
}

export function OptionMappingFilters({
  manufacturers,
  searchQuery,
  onSearchChange,
  selectedManufacturer,
  onManufacturerChange,
  onAddNew,
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
          type="search"
          placeholder="상품코드, 옵션명 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white border-slate-200"
        />
      </div>

      {/* Manufacturer Filter */}
      <Select value={selectedManufacturer} onValueChange={onManufacturerChange}>
        <SelectTrigger className="w-[180px] bg-white border-slate-200">
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

      {/* Add New Mapping Button */}
      <div className="ml-auto">
        <Button onClick={onAddNew} className="gap-2 bg-slate-900 hover:bg-slate-800">
          <Plus className="h-4 w-4" />
          매핑 추가
        </Button>
      </div>
    </div>
  )
}
