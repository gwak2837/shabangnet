import { AlertCircle, ArrowRight, Banknote, Building2, Copy, Package, TrendingUp } from 'lucide-react'
import Link from 'next/link'

import { SabangnetDownloadButton } from '@/app/upload/sabangnet-download-button'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatCompactNumber } from '@/utils/format'

export interface UploadResultData {
  duplicateOrders?: number
  errorOrders: number
  errors: { row: number; message: string; productCode?: string; productName?: string }[]
  fileName: string
  mallName?: string
  manufacturerBreakdown: {
    name: string
    orders: number
    amount: number
    totalQuantity?: number
    totalCost?: number
    productCount?: number
    marginRate?: number | null
  }[]
  orderNumbers?: string[]
  processedOrders: number
  success: boolean
  summary?: {
    totalAmount: number
    totalCost: number
    estimatedMargin: number | null
  }
  totalOrders: number
  uploadId: number
}

interface UploadResultProps {
  data: UploadResultData
}

export function UploadResult({ data }: UploadResultProps) {
  const { totalAmount, estimatedMargin } = data.summary ?? { totalAmount: 0, estimatedMargin: null }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {/* 처리된 주문 - Blue: 정보성, 주요 지표 */}
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
        {/* 제조사 수 - Indigo: 구조/조직 정보 */}
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사 수</p>
              <p className="text-xl font-semibold text-slate-900">{data.manufacturerBreakdown.length}곳</p>
            </div>
          </CardContent>
        </Card>
        {/* 중복 건너뜀 - Slate: 중립적, 보조 정보 */}
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
        {/* 오류 건수 - Rose: 오류, 주의 필요 */}
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <AlertCircle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">오류 건수</p>
              <p className="text-xl font-semibold text-slate-900">{data.errorOrders}건</p>
            </div>
          </CardContent>
        </Card>
        {/* 총 금액 - Emerald: 금액, 재정 */}
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Banknote className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">총 금액</p>
              <p className="text-xl font-semibold text-slate-900">{formatCompactNumber(totalAmount)}원</p>
            </div>
          </CardContent>
        </Card>
        {/* 예상 마진 - Teal: 수익, 긍정적 결과 */}
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50">
              <TrendingUp className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">예상 마진</p>
              <p className="text-xl font-semibold text-slate-900">
                {estimatedMargin != null ? `${formatCompactNumber(estimatedMargin)}원` : '-'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manufacturer Breakdown */}
      {data.manufacturerBreakdown.length > 0 && (
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardHeader className="p-6 pb-0">
            <CardTitle className="text-base font-semibold text-slate-900">제조사별 분류 결과</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    주문
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    수량
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    상품
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    금액
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    원가
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                    마진율
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.manufacturerBreakdown.map((m) => (
                  <TableRow className="hover:bg-slate-50 transition-colors" key={m.name}>
                    <TableCell className="font-medium text-slate-900">{m.name || '미지정'}</TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">{m.orders}건</TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">
                      {m.totalQuantity ?? m.orders}개
                    </TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">
                      {m.productCount != null && m.productCount > 0 ? `${m.productCount}종` : '-'}
                    </TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">
                      {m.amount.toLocaleString()}원
                    </TableCell>
                    <TableCell className="text-right text-slate-700 tabular-nums">
                      {m.totalCost ? `${m.totalCost.toLocaleString()}원` : '-'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {m.marginRate != null ? (
                        <div
                          className="group flex items-center justify-end gap-2"
                          data-negative={m.marginRate < 0 || undefined}
                        >
                          <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-teal-500 group-data-negative:bg-rose-500"
                              style={{ width: `${Math.min(100, Math.abs(m.marginRate))}%` }}
                            />
                          </div>
                          <span className="text-sm w-14 text-right font-medium text-slate-700 group-data-negative:text-rose-600">
                            {m.marginRate}%
                          </span>
                        </div>
                      ) : (
                        '-'
                      )}
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

            <div className="mt-4">
              <Button asChild variant="outline">
                <Link href="/product">
                  상품 매핑 관리
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <SabangnetDownloadButton mallName={data.mallName ?? '사방넷'} orderNumbers={data.orderNumbers ?? []} />
        <Button asChild>
          <Link href="/order">
            발주 생성
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  )
}
