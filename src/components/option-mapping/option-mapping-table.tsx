'use client'

import { Edit2, Settings2, Trash2 } from 'lucide-react'

import type { OptionManufacturerMapping } from '@/services/option-mappings'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate } from '@/utils/format'

interface OptionMappingTableProps {
  mappings: OptionManufacturerMapping[]
  onDelete: (mappingId: number) => void
  onEdit: (mapping: OptionManufacturerMapping) => void
}

export function OptionMappingTable({ mappings, onEdit, onDelete }: OptionMappingTableProps) {
  return (
    <Card className="border-slate-200 bg-card shadow-sm">
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품코드</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">옵션명</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">수정일</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                관리
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping) => (
              <TableRow className="hover:bg-slate-50 transition-colors" key={mapping.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100">
                      <Settings2 className="h-4 w-4 text-slate-500" />
                    </div>
                    <code className="text-sm font-mono text-slate-700">{mapping.productCode}</code>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200" variant="outline">
                    {mapping.optionName}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className="bg-slate-100 text-slate-700" variant="secondary">
                    {mapping.manufacturerName}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">{formatDate(mapping.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button className="h-8 w-8 p-0" onClick={() => onEdit(mapping)} size="sm" variant="ghost">
                      <Edit2 className="h-4 w-4 text-slate-500" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button className="h-8 w-8 p-0 hover:bg-rose-50" size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4 text-slate-500 hover:text-rose-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>매핑 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            &apos;{mapping.productCode} - {mapping.optionName}&apos; 매핑을 삭제하시겠습니까?
                            <br />
                            삭제 후에는 기본 상품-제조사 매핑이 적용됩니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-rose-600 hover:bg-rose-700"
                            onClick={() => onDelete(mapping.id)}
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {mappings.length === 0 && (
              <TableRow>
                <TableCell className="h-32 text-center text-slate-500" colSpan={5}>
                  옵션-제조사 매핑이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
