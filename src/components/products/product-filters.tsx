'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Search, X } from 'lucide-react'

interface ProductFiltersProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  showUnmappedOnly: boolean
  onShowUnmappedChange: (value: boolean) => void
}

export function ProductFilters({
  searchQuery,
  onSearchChange,
  showUnmappedOnly,
  onShowUnmappedChange,
}: ProductFiltersProps) {
  const hasActiveFilters = searchQuery || showUnmappedOnly

  function handleClear() {
    onSearchChange('')
    onShowUnmappedChange(false)
  }

  return (
    <div className="flex items-center gap-4">
      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="search"
          placeholder="상품코드, 상품명 검색..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-white border-slate-200"
        />
      </div>

      {/* Unmapped Only Filter */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="unmapped"
          checked={showUnmappedOnly}
          onCheckedChange={(checked) => onShowUnmappedChange(checked as boolean)}
        />
        <Label htmlFor="unmapped" className="text-sm font-medium text-slate-700 cursor-pointer">
          미매핑 상품만 보기
        </Label>
      </div>

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
