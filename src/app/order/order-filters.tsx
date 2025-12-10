'use client'

import { Calendar, Loader2, Search, X } from 'lucide-react'
import { startTransition, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { type OrderFilters as OrderFiltersType, useManufacturerOptions } from './hook'

const STATUSES = [
  { id: 'all', name: '전체 상태' },
  { id: 'pending', name: '대기중' },
  { id: 'sent', name: '발송완료' },
  { id: 'error', name: '오류' },
] as const

interface OrderFiltersProps {
  filters: OrderFiltersType
  onFiltersChange: (filters: OrderFiltersType) => void
}

const DEBOUNCE_MS = 300

export function OrderFilters({ filters, onFiltersChange }: OrderFiltersProps) {
  const { data: manufacturers = [], isLoading: isLoadingManufacturers } = useManufacturerOptions()

  const [localSearch, setLocalSearch] = useState(filters.search ?? '')
  const prevFiltersSearchRef = useRef(filters.search)
  const isInternalUpdateRef = useRef(false)

  const hasActiveFilters =
    filters.manufacturerId ||
    (filters.status && filters.status !== 'all') ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search

  // Sync controlled search with local state when changed externally
  useEffect(() => {
    const prevSearch = prevFiltersSearchRef.current

    // Only sync if it's an external change (not from our debounced update)
    if (!isInternalUpdateRef.current && filters.search !== prevSearch) {
      if (filters.search !== localSearch) {
        startTransition(() => {
          setLocalSearch(filters.search ?? '')
        })
      }
    }
    prevFiltersSearchRef.current = filters.search
    isInternalUpdateRef.current = false
  }, [filters.search, localSearch])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        isInternalUpdateRef.current = true
        onFiltersChange({ ...filters, search: localSearch || undefined })
      }
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [localSearch, filters, onFiltersChange])

  function handleManufacturerChange(value: string) {
    const manufacturerId = value === 'all' ? undefined : Number(value)
    onFiltersChange({ ...filters, manufacturerId })
  }

  function handleStatusChange(value: string) {
    const status = value as OrderFiltersType['status']
    onFiltersChange({ ...filters, status: status === 'all' ? undefined : status })
  }

  function handleDateFromChange(value: string) {
    onFiltersChange({ ...filters, dateFrom: value || undefined })
  }

  function handleDateToChange(value: string) {
    onFiltersChange({ ...filters, dateTo: value || undefined })
  }

  function handleClearFilters() {
    setLocalSearch('')
    onFiltersChange({})
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9 bg-background border-slate-200"
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="제조사명, 주문번호, 고객명, 상품명 검색..."
            type="search"
            value={localSearch}
          />
        </div>

        {/* Manufacturer Select */}
        <Select onValueChange={handleManufacturerChange} value={filters.manufacturerId?.toString() ?? 'all'}>
          <SelectTrigger className="w-[180px] bg-background border-slate-200">
            {isLoadingManufacturers ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SelectValue placeholder="제조사 선택" />
            )}
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

        {/* Status Select */}
        <Select onValueChange={handleStatusChange} value={filters.status ?? 'all'}>
          <SelectTrigger className="w-[150px] bg-background border-slate-200">
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date Range */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="w-[150px] pl-9 bg-background border-slate-200"
              onChange={(e) => handleDateFromChange(e.target.value)}
              type="date"
              value={filters.dateFrom ?? ''}
            />
          </div>
          <span className="text-slate-400">~</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="w-[150px] pl-9 bg-background border-slate-200"
              onChange={(e) => handleDateToChange(e.target.value)}
              type="date"
              value={filters.dateTo ?? ''}
            />
          </div>
        </div>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            className="gap-1 text-slate-500 hover:text-slate-700"
            onClick={handleClearFilters}
            size="sm"
            variant="ghost"
          >
            <X className="h-4 w-4" />
            필터 초기화
          </Button>
        )}
      </div>
    </div>
  )
}
