'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { type Manufacturer, manufacturers, formatDate } from '@/lib/mock-data';
import { MoreHorizontal, Pencil, Trash2, Search, Plus, Mail, Phone } from 'lucide-react';

interface ManufacturerTableProps {
  onEdit: (manufacturer: Manufacturer) => void;
  onAdd: () => void;
}

export function ManufacturerTable({ onEdit, onAdd }: ManufacturerTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);

  const filteredManufacturers = manufacturers.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = () => {
    // In real app, this would call API to delete
    console.log('Delete manufacturer:', deleteTarget?.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardContent className="p-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 p-4">
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="search"
                placeholder="제조사명, 담당자, 이메일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-slate-50 border-slate-200"
              />
            </div>
            <Button onClick={onAdd} className="gap-2 bg-slate-900 hover:bg-slate-800">
              <Plus className="h-4 w-4" />
              제조사 추가
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  제조사
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  담당자
                </TableHead>
                <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                  연락처
                </TableHead>
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
                <TableRow key={manufacturer.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-600">
                        {manufacturer.name.slice(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{manufacturer.name}</p>
                        {manufacturer.ccEmail && (
                          <p className="text-xs text-slate-500">CC: {manufacturer.ccEmail}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{manufacturer.contactName}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        {manufacturer.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        {manufacturer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                      {manufacturer.orderCount.toLocaleString()}건
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {formatDate(manufacturer.lastOrderDate)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(manufacturer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          수정
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteTarget(manufacturer)}
                          className="text-rose-600 focus:text-rose-600"
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
                  <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                    검색 결과가 없습니다.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>제조사 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>을(를) 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

