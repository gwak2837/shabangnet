'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { type OptionManufacturerMapping, formatDate } from '@/lib/mock-data'
import { Edit2, Trash2, Settings2 } from 'lucide-react'

interface OptionMappingTableProps {
  mappings: OptionManufacturerMapping[]
  onEdit: (mapping: OptionManufacturerMapping) => void
  onDelete: (mappingId: string) => void
}

export function OptionMappingTable({ mappings, onEdit, onDelete }: OptionMappingTableProps) {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
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
              <TableRow key={mapping.id} className="hover:bg-slate-50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100">
                      <Settings2 className="h-4 w-4 text-slate-500" />
                    </div>
                    <code className="text-sm font-mono text-slate-700">{mapping.productCode}</code>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {mapping.optionName}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                    {mapping.manufacturerName}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-slate-500">{formatDate(mapping.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(mapping)} className="h-8 w-8 p-0">
                      <Edit2 className="h-4 w-4 text-slate-500" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-rose-50">
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
                            onClick={() => onDelete(mapping.id)}
                            className="bg-rose-600 hover:bg-rose-700"
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
                <TableCell colSpan={5} className="h-32 text-center text-slate-500">
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

