'use client'

import { Download, Mail, MoreHorizontal, Pencil, Phone, Plus, Search, Trash2, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { Manufacturer } from '@/services/manufacturers.types'

import { ManufacturerCsvDialog } from '@/components/manufacturer/manufacturer-csv-dialog'
import { MANUFACTURER_CSV_HEADER } from '@/components/manufacturer/manufacturer-csv.types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { stringifyCsv } from '@/utils/csv'
import { formatRelativeTime } from '@/utils/format/date'
import { formatDateTime } from '@/utils/format/number'

interface ManufacturerTableProps {
  manufacturers: Manufacturer[]
  onAdd: () => void
  onDelete: (id: number) => void
  onEdit: (manufacturer: Manufacturer) => void
}

export function ManufacturerTable({ manufacturers, onEdit, onAdd, onDelete }: ManufacturerTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)

  const filteredManufacturers = useMemo(() => {
    return manufacturers.filter(
      (m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
    )
  }, [manufacturers, searchQuery])

  function handleDelete() {
    if (deleteTarget) {
      onDelete(deleteTarget.id)
    }
    setDeleteTarget(null)
  }

  function handleDownloadCsv() {
    const rows = [
      MANUFACTURER_CSV_HEADER,
      ...manufacturers.map((m) => [m.name, m.contactName, m.email ?? '', m.ccEmail ?? '', m.phone]),
    ] as const

    const csvText = stringifyCsv(rows, { bom: true })
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)

    const today = new Date().toISOString().split('T')[0]
    const link = document.createElement('a')
    link.href = url
    link.download = `제조사_${today}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="p-0 overflow-x-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9 bg-slate-50 border-slate-200"
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제조사명, 담당자, 이메일 검색..."
                type="search"
                value={searchQuery}
              />
            </div>
            <div className="flex items-center gap-2">
              <Button className="gap-2" onClick={handleDownloadCsv} variant="outline">
                <Download className="h-4 w-4" />
                CSV 다운로드
              </Button>
              <Button className="gap-2" onClick={() => setIsCsvDialogOpen(true)} variant="outline">
                <Upload className="h-4 w-4" />
                CSV 업로드
              </Button>
              <Button className="gap-2 bg-slate-900 hover:bg-slate-800" onClick={onAdd}>
                <Plus className="h-4 w-4" />
                제조사 추가
              </Button>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">담당자</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">연락처</TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                  누적 주문
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  최근 발주일
                </TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredManufacturers.map((manufacturer) => (
                <TableRow className="hover:bg-slate-50 transition-colors" key={manufacturer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                        {manufacturer.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{manufacturer.name}</p>
                        {manufacturer.ccEmail && <p className="text-xs text-slate-500">CC: {manufacturer.ccEmail}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{manufacturer.contactName}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {manufacturer.email ? (
                          manufacturer.email
                        ) : (
                          <span className="text-amber-700">이메일 미설정</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {manufacturer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-slate-100 text-slate-700 tabular-nums" variant="secondary">
                      {manufacturer.orderCount.toLocaleString()}건
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500" title={formatDateTime(manufacturer.lastOrderDate)}>
                    {formatRelativeTime(manufacturer.lastOrderDate)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="h-8 w-8 text-slate-400 hover:text-slate-600" size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(manufacturer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-600"
                          onClick={() => setDeleteTarget(manufacturer)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          삭제
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
              {filteredManufacturers.length === 0 && (
                <TableRow>
                  <TableCell className="h-32 text-center text-slate-500" colSpan={6}>
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog onOpenChange={() => setDeleteTarget(null)} open={!!deleteTarget}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제조사 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>
              을(를) 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={handleDelete}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ManufacturerCsvDialog onOpenChange={setIsCsvDialogOpen} open={isCsvDialogOpen} />
    </>
  )
}
