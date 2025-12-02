'use client'

import { AlertCircle, AlertTriangle, CheckCircle2, Download, FileSpreadsheet, RefreshCw } from 'lucide-react'

import type { InvoiceConvertResultItem } from '@/services/invoice-convert'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ConvertResultProps {
  fileName: string
  onDownload: () => void
  onReset: () => void
  results: InvoiceConvertResultItem[]
}

export function ConvertResult({ results, fileName, onDownload, onReset }: ConvertResultProps) {
  const successResults = results.filter((r) => r.status === 'success')
  const courierErrors = results.filter((r) => r.status === 'courier_error')
  const orderErrors = results.filter((r) => r.status === 'order_not_found')
  const totalErrors = courierErrors.length + orderErrors.length

  const successRate = ((successResults.length / results.length) * 100).toFixed(1)

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <FileSpreadsheet className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">총 데이터</p>
              <p className="text-xl font-semibold text-slate-900">{results.length}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">변환 성공</p>
              <p className="text-xl font-semibold text-slate-900">{successResults.length}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">택배사 오류</p>
              <p className="text-xl font-semibold text-slate-900">{courierErrors.length}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">주문 미매칭</p>
              <p className="text-xl font-semibold text-slate-900">{orderErrors.length}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Rate */}
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">변환 성공률</span>
            <span className="text-sm font-semibold text-slate-900">{successRate}%</span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full transition-all bg-emerald-500" style={{ width: `${successRate}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Success Results Preview */}
      {successResults.length > 0 && (
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base font-semibold text-slate-900">
                변환 성공 ({successResults.length}건)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead className="text-xs font-medium text-slate-500">사방넷 주문번호</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">택배사 코드</TableHead>
                    <TableHead className="text-xs font-medium text-slate-500">송장번호</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {successResults.slice(0, 5).map((result, idx) => (
                    <TableRow className="hover:bg-slate-50" key={idx}>
                      <TableCell className="font-mono text-sm">{result.orderNumber}</TableCell>
                      <TableCell>
                        <Badge className="font-mono" variant="secondary">
                          {result.courierCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{result.trackingNumber}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {successResults.length > 5 && (
              <p className="mt-3 text-sm text-slate-500 text-center">외 {successResults.length - 5}건...</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {totalErrors > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-base font-semibold text-amber-900">오류 목록 ({totalErrors}건)</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <div className="rounded-lg border border-amber-200 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-amber-100/50 border-amber-200">
                    <TableHead className="text-xs font-medium text-amber-700">주문번호</TableHead>
                    <TableHead className="text-xs font-medium text-amber-700">송장번호</TableHead>
                    <TableHead className="text-xs font-medium text-amber-700">오류 유형</TableHead>
                    <TableHead className="text-xs font-medium text-amber-700">상세</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...courierErrors, ...orderErrors].map((result, idx) => (
                    <TableRow className="hover:bg-amber-100/50 border-amber-200" key={idx}>
                      <TableCell className="font-mono text-sm text-amber-900">{result.orderNumber}</TableCell>
                      <TableCell className="font-mono text-sm text-amber-800">{result.trackingNumber}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            result.status === 'courier_error'
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-rose-200 text-rose-800'
                          }
                          variant="secondary"
                        >
                          {result.status === 'courier_error' ? '택배사 미등록' : '주문 미매칭'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-amber-800">
                        {result.status === 'courier_error' ? `원본: ${result.originalCourier}` : result.errorMessage}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-amber-100 text-sm text-amber-800">
              <p>
                <strong>참고:</strong> 오류가 있는 건은 변환 결과 파일에서 제외됩니다. 택배사 오류는 설정 &gt; 택배사
                관리에서 별칭을 추가하여 해결할 수 있습니다.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Output File Info */}
      <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                <FileSpreadsheet className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold text-emerald-900">{fileName}</p>
                <p className="text-sm text-emerald-700">사방넷 송장 업로드 양식 (성공 {successResults.length}건)</p>
              </div>
            </div>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={successResults.length === 0}
              onClick={onDownload}
            >
              <Download className="mr-2 h-4 w-4" />
              다운로드
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button onClick={onReset} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          새로 변환
        </Button>
      </div>
    </div>
  )
}
