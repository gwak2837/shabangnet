'use client'

import { FileSpreadsheet, Loader2 } from 'lucide-react'

import type { Upload } from '@/services/dashboard'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDateTime, formatFileSize, getStatusColor, getStatusLabel } from '@/utils/format/number'

interface RecentUploadsProps {
  isLoading?: boolean
  uploads: Upload[]
}

export function RecentUploads({ uploads, isLoading }: RecentUploadsProps) {
  return (
    <Card className="border-slate-200 bg-card shadow-sm py-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900">최근 업로드</CardTitle>
          <a className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors" href="/upload">
            모두 보기
          </a>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : (
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
              {uploads.map((upload) => (
                <TableRow className="hover:bg-slate-50 transition-colors" key={upload.id}>
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
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-slate-900 tabular-nums">{upload.totalOrders.toLocaleString()}건</p>
                      {upload.errorOrders > 0 && (
                        <p className="text-xs text-rose-600 tabular-nums">오류 {upload.errorOrders}건</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(upload.status)} variant="secondary">
                      {getStatusLabel(upload.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm text-slate-500">
                    {formatDateTime(upload.uploadedAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
