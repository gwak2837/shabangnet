'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Package } from 'lucide-react'
import Link from 'next/link'

// Mock processed data
const mockProcessResult = {
  totalOrders: 156,
  recognizedColumns: ['주문번호', '수취인명', '전화번호', '주소', '상품코드', '상품명', '옵션', '수량', '판매가'],
  manufacturerBreakdown: [
    { name: '농심식품', orders: 45, amount: 892000 },
    { name: 'CJ제일제당', orders: 38, amount: 756000 },
    { name: '오뚜기', orders: 32, amount: 584000 },
    { name: '동원F&B', orders: 25, amount: 498000 },
    { name: '풀무원', orders: 16, amount: 312000 },
  ],
  errors: [
    {
      row: 45,
      productCode: 'UNKNOWN-123',
      productName: '미등록 상품 A',
      reason: '제조사 매핑 없음',
    },
    {
      row: 89,
      productCode: 'UNKNOWN-456',
      productName: '미등록 상품 B',
      reason: '제조사 매핑 없음',
    },
    {
      row: 112,
      productCode: 'ERR-789',
      productName: '데이터 오류 상품',
      reason: '필수 데이터 누락',
    },
  ],
}

interface UploadResultProps {
  fileName: string
}

export function UploadResult({ fileName }: UploadResultProps) {
  const totalAmount = mockProcessResult.manufacturerBreakdown.reduce((sum, m) => sum + m.amount, 0)

  return (
    <div className="space-y-5">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">총 주문 수</p>
              <p className="text-xl font-semibold text-slate-900">{mockProcessResult.totalOrders.toLocaleString()}건</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사 수</p>
              <p className="text-xl font-semibold text-slate-900">{mockProcessResult.manufacturerBreakdown.length}곳</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">오류 건수</p>
              <p className="text-xl font-semibold text-slate-900">{mockProcessResult.errors.length}건</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recognized Columns */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-base font-semibold text-slate-900">인식된 컬럼</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-4 pb-4">
          <div className="flex flex-wrap gap-2">
            {mockProcessResult.recognizedColumns.map((col) => (
              <Badge key={col} variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100">
                {col}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Manufacturer Breakdown */}
      <Card className="border-slate-200 bg-white shadow-sm">
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
                  비율
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProcessResult.manufacturerBreakdown.map((m) => (
                <TableRow key={m.name} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{m.name}</TableCell>
                  <TableCell className="text-right text-slate-700">{m.orders}건</TableCell>
                  <TableCell className="text-right text-slate-700">{m.amount.toLocaleString()}원</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${(m.amount / totalAmount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-slate-500 w-12 text-right">
                        {((m.amount / totalAmount) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Errors */}
      {mockProcessResult.errors.length > 0 && (
        <Card className="border-rose-200 bg-rose-50/50 shadow-sm">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-rose-600" />
              <CardTitle className="text-base font-semibold text-rose-900">
                오류 목록 ({mockProcessResult.errors.length}건)
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
                {mockProcessResult.errors.map((error, idx) => (
                  <TableRow key={idx} className="hover:bg-rose-100/50 transition-colors border-rose-200">
                    <TableCell className="font-medium text-rose-900">{error.row}</TableCell>
                    <TableCell className="text-rose-800">{error.productCode}</TableCell>
                    <TableCell className="text-rose-800">{error.productName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="bg-rose-200 text-rose-800 hover:bg-rose-200">
                        {error.reason}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center gap-4">
              <Link href="/products">
                <Button variant="outline" size="sm" className="border-rose-300 text-rose-700 hover:bg-rose-100">
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
        <Button variant="outline">다시 업로드</Button>
        <Link href="/orders">
          <Button className="bg-slate-900 hover:bg-slate-800">
            발주 생성으로 이동
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
