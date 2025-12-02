'use client'

import { Calendar, Filter, Search, X } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const manufacturers = [
  { id: 'all', name: '전체 제조사' },
  { id: 'm1', name: '농심식품' },
  { id: 'm2', name: 'CJ제일제당' },
  { id: 'm3', name: '오뚜기' },
  { id: 'm4', name: '동원F&B' },
  { id: 'm5', name: '풀무원' },
]

const statuses = [
  { id: 'all', name: '전체 상태' },
  { id: 'pending', name: '대기중' },
  { id: 'ready', name: '발송대기' },
  { id: 'sent', name: '발송완료' },
  { id: 'error', name: '오류' },
]

interface OrderFiltersProps {
  onFilterChange?: (filters: {
    manufacturer: string
    status: string
    dateFrom: string
    dateTo: string
    search: string
  }) => void
}

export function OrderFilters({ onFilterChange }: OrderFiltersProps) {
  const [manufacturer, setManufacturer] = useState('all')
  const [status, setStatus] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const hasActiveFilters = manufacturer !== 'all' || status !== 'all' || dateFrom || dateTo || search

  function handleClearFilters() {
    setManufacturer('all')
    setStatus('all')
    setDateFrom('')
    setDateTo('')
    setSearch('')
    onFilterChange?.({
      manufacturer: 'all',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      search: '',
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9 bg-background border-slate-200"
            onChange={(e) => setSearch(e.target.value)}
            placeholder="제조사명, 주문번호 검색..."
            type="search"
            value={search}
          />
        </div>

        {/* Manufacturer Select */}
        <Select onValueChange={setManufacturer} value={manufacturer}>
          <SelectTrigger className="w-[180px] bg-background border-slate-200">
            <SelectValue placeholder="제조사 선택" />
          </SelectTrigger>
          <SelectContent>
            {manufacturers.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Select */}
        <Select onValueChange={setStatus} value={status}>
          <SelectTrigger className="w-[150px] bg-background border-slate-200">
            <SelectValue placeholder="상태 선택" />
          </SelectTrigger>
          <SelectContent>
            {statuses.map((s) => (
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
              onChange={(e) => setDateFrom(e.target.value)}
              type="date"
              value={dateFrom}
            />
          </div>
          <span className="text-slate-400">~</span>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="w-[150px] pl-9 bg-background border-slate-200"
              onChange={(e) => setDateTo(e.target.value)}
              type="date"
              value={dateTo}
            />
          </div>
        </div>

        {/* Filter Button */}
        <Button className="gap-2 border-slate-200" variant="outline">
          <Filter className="h-4 w-4" />
          필터 적용
        </Button>

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
