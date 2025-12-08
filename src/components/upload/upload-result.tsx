'use client'

import { AlertCircle, ArrowRight, Building2, CheckCircle2, Copy, Download, Package } from 'lucide-react'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface ManufacturerBreakdown {
  amount: number
  name: string
  orders: number
}

interface UploadError {
  message: string
  productCode?: string
  productName?: string
  row: number
}

interface UploadResultData {
  duplicateOrders?: number
  errorOrders: number
  errors: UploadError[]
  fileName: string
  mallName?: string
  manufacturerBreakdown: ManufacturerBreakdown[]
  processedOrders: number
  success: boolean
  totalOrders: number
  uploadId: string
}

interface UploadResultProps {
  data: UploadResultData
  uploadType: 'sabangnet' | 'shopping_mall'
}

export function UploadResult({ data, uploadType }: UploadResultProps) {
  const totalAmount = data.manufacturerBreakdown.reduce((sum, m) => sum + m.amount, 0)

  const handleDownloadSabangnetFormat = () => {
    // TODO: 실제 다운로드 구현
    alert('사방넷 양식으로 변환된 파일을 다운로드합니다')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">처리된 주문</p>
              <p className="text-xl font-semibold text-slate-900">{data.processedOrders.toLocaleString()}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사 수</p>
              <p className="text-xl font-semibold text-slate-900">{data.manufacturerBreakdown.length}곳</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Copy className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">중복 건너뜀</p>
              <p className="text-xl font-semibold text-slate-900">{data.duplicateOrders ?? 0}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">오류 건수</p>
              <p className="text-xl font-semibold text-slate-900">{data.errorOrders}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Success Message */}
      {data.processedOrders > 0 && (
        <Card className="border-emerald-200 bg-emerald-50/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <div>
                <p className="font-medium text-emerald-900">파일 처리 완료</p>
                <p className="text-sm text-emerald-700">
                  총 {data.processedOrders}건의 주문이 성공적으로 처리되었습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Duplicate Notice */}
      {(data.duplicateOrders ?? 0) > 0 && (
        <Card className="border-slate-200 bg-slate-50/50 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Copy className="h-5 w-5 text-slate-600" />
              <div>
                <p className="font-medium text-slate-900">중복 주문 건너뜀</p>
                <p className="text-sm text-slate-700">
                  이미 등록된 주문번호 {data.duplicateOrders}건은 중복으로 건너뛰었습니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manufacturer Breakdown */}
      {data.manufacturerBreakdown.length > 0 && (
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <CardTitle className="text-base font-semibold text-slate-900">제조사별 분류 결과</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    주문 수
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    금액
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    금액 비율
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.manufacturerBreakdown.map((m) => (
                  <TableRow className="hover:bg-slate-50 transition-colors" key={m.name}>
                    <TableCell className="font-medium text-slate-900">{m.name || '미지정'}</TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">{m.orders}건</TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">
                      {m.amount.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{
                              width: `${totalAmount > 0 ? (m.amount / totalAmount) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-sm text-slate-500 w-12 text-right">
                          {totalAmount > 0 ? ((m.amount / totalAmount) * 100).toFixed(1) : '0.0'}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Errors */}
      {data.errors.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <CardTitle className="text-base font-semibold text-rose-900">
                오류 목록 ({data.errors.length}건)
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-rose-200">
                  <TableHead className="text-xs font-medium text-rose-600 uppercase tracking-wider">행 번호</TableHead>
                  <TableHead className="text-xs font-medium text-rose-600 uppercase tracking-wider">상품코드</TableHead>
                  <TableHead className="text-xs font-medium text-rose-600 uppercase tracking-wider">상품명</TableHead>
                  <TableHead className="text-xs font-medium text-rose-600 uppercase tracking-wider">
                    오류 사유
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.errors.slice(0, 10).map((error, idx) => (
                  <TableRow className="hover:bg-rose-100/50 transition-colors border-rose-200" key={idx}>
                    <TableCell className="font-medium text-rose-900">{error.row}</TableCell>
                    <TableCell className="text-rose-800">{error.productCode || '-'}</TableCell>
                    <TableCell className="text-rose-800">{error.productName || '-'}</TableCell>
                    <TableCell>
                      <Badge className="bg-rose-200 text-rose-800 hover:bg-rose-200" variant="secondary">
                        {error.message}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {data.errors.length > 10 && (
              <p className="mt-3 text-sm text-rose-600">외 {data.errors.length - 10}건의 오류가 더 있습니다.</p>
            )}

            <div className="mt-4 flex items-center gap-4">
              <Link href="/product">
                <Button className="border-rose-300 text-rose-700 hover:bg-rose-100" size="sm" variant="outline">
                  상품 매핑 관리로 이동
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        {uploadType === 'shopping_mall' && (
          <Button className="gap-2" onClick={handleDownloadSabangnetFormat} variant="outline">
            <Download className="h-4 w-4" />
            사방넷 양식 다운로드
          </Button>
        )}
        <Link href="/order">
          <Button className="bg-slate-900 hover:bg-slate-800">
            발주 생성으로 이동
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
