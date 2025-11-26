'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { recentUploads, formatDateTime, formatFileSize, getStatusColor, getStatusLabel } from '@/lib/mock-data'
import { FileSpreadsheet } from 'lucide-react'

export function RecentUploads() {
  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">최근 업로드</CardTitle>
          <a href="/upload" className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
            모두 보기
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">파일</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">주문 수</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상태</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                업로드 시간
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentUploads.map((upload) => (
              <TableRow key={upload.id} className="hover:bg-slate-50 transition-colors">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{upload.fileName}</p>
                      <p className="text-xs text-slate-500">{formatFileSize(upload.fileSize)}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">{upload.totalOrders.toLocaleString()}건</p>
                    {upload.errorOrders > 0 && <p className="text-xs text-rose-600">오류 {upload.errorOrders}건</p>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={getStatusColor(upload.status)}>
                    {getStatusLabel(upload.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-slate-500">{formatDateTime(upload.uploadedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
