'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Building2, Link2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'

import { queryKeys } from '@/common/constants/query-keys'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useServerAction } from '@/hooks/use-server-action'
import { saveProductManufacturerLink } from '@/services/product-manufacturer-links'

interface MatchingResponse {
  missingEmailManufacturers: MissingEmailManufacturer[]
  unmappedProducts: { orderCount: number; productCode: string; productName: string }[]
  unmatchedProductCodes: UnmatchedProductCodeGroup[]
}

interface MissingEmailManufacturer {
  id: number
  name: string
  orderCount: number
}

interface UnmatchedProductCodeGroup {
  orderCount: number
  productCode: string
  productNameSample: string
}

export default function OrderMatchingPage() {
  const { data: manufacturers = [] } = useManufacturers()
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.orders.matching,
    queryFn: getMatchingData,
  })

  const missingEmail = data?.missingEmailManufacturers ?? []
  const unmatched = data?.unmatchedProductCodes ?? []
  const unmappedProducts = data?.unmappedProducts ?? []

  const [selectionByProductCode, setSelectionByProductCode] = useState<Record<string, string>>({})
  const manufacturerOptions = manufacturers.map((m) => ({ id: m.id, name: m.name }))

  const [isSaving, saveLink] = useServerAction(saveProductManufacturerLink, {
    invalidateKeys: [queryKeys.orders.batches, queryKeys.orders.matching, queryKeys.products.all],
    onSuccess: async (result) => {
      const updatedOrders =
        result && typeof result === 'object' && 'updatedOrders' in result ? Number(result.updatedOrders ?? 0) : 0

      if (Number.isFinite(updatedOrders) && updatedOrders > 0) {
        toast.success(`기존 주문 ${updatedOrders}건에 반영됐어요`)
      } else {
        toast.success('제조사 연결이 저장됐어요')
      }
      await refetch()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertTriangle className="h-5 w-5 text-amber-700" />
            </div>
            <div>
              <p className="text-sm text-slate-500">발송 이메일 미설정</p>
              <p className="text-xl font-semibold text-slate-900">{missingEmail.length}곳</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Link2 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사 연결 필요(주문 기준)</p>
              <p className="text-xl font-semibold text-slate-900">{unmatched.length}개</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <Link2 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">제조사 연결 필요(상품 기준)</p>
              <div className="flex items-center gap-2">
                <p className="text-xl font-semibold text-slate-900">{unmappedProducts.length}개</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Missing Email Manufacturers */}
      {missingEmail.length > 0 && (
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-600" />
                <p className="font-medium text-slate-900">이메일 설정이 필요한 제조사</p>
              </div>
              <Button asChild size="sm" variant="outline">
                <Link href="/manufacturer">제조사 관리로 이동</Link>
              </Button>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {missingEmail.slice(0, 12).map((m) => (
                <span
                  className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 text-sm"
                  key={m.id}
                  title={`주문 ${m.orderCount}건`}
                >
                  {m.name}
                  <span className="text-xs text-amber-700">{m.orderCount}건</span>
                </span>
              ))}
              {missingEmail.length > 12 && (
                <span className="text-sm text-slate-500">외 {missingEmail.length - 12}곳</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unmatched product codes */}
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div>
              <p className="font-medium text-slate-900">제조사 연결 필요(주문 기준)</p>
              <p className="text-sm text-slate-500">
                제조사를 연결하면 <span className="font-medium">기존 주문에도 자동으로 반영</span>되고, 다음 업로드부터
                자동 연결돼요.
              </p>
            </div>
            <Button disabled={isSaving} onClick={() => void refetch()} size="sm" variant="outline">
              새로고침
            </Button>
          </div>

          {unmatched.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">제조사 미연결 주문이 없어요</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    상품코드
                  </TableHead>
                  <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품명</TableHead>
                  <TableHead className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    주문 수
                  </TableHead>
                  <TableHead className="text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                    제조사 연결
                  </TableHead>
                  <TableHead className="w-[1%] whitespace-nowrap" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {unmatched.map((row) => {
                  const selected = selectionByProductCode[row.productCode] ?? ''

                  return (
                    <TableRow className="hover:bg-slate-50 transition-colors" key={row.productCode}>
                      <TableCell className="font-mono text-sm text-slate-800">{row.productCode}</TableCell>
                      <TableCell className="text-slate-700 max-w-[360px] truncate" title={row.productNameSample}>
                        {row.productNameSample || '-'}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-slate-700">{row.orderCount}건</TableCell>
                      <TableCell className="w-[1%]">
                        <Select
                          onValueChange={(value) =>
                            setSelectionByProductCode((prev) => ({ ...prev, [row.productCode]: value }))
                          }
                          value={selected}
                        >
                          <SelectTrigger className="w-[220px] bg-background border-slate-200">
                            <SelectValue placeholder="제조사 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {manufacturerOptions.map((m) => (
                              <SelectItem key={m.id} value={String(m.id)}>
                                {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="w-[1%] whitespace-nowrap">
                        <Button
                          disabled={!selected || isSaving}
                          onClick={() => {
                            const manufacturerId = Number(selected)
                            if (!manufacturerId) {
                              toast.error('제조사를 선택해 주세요')
                              return
                            }
                            saveLink({
                              productCode: row.productCode,
                              productName: row.productNameSample || undefined,
                              manufacturerId,
                            })
                          }}
                          size="sm"
                        >
                          연결하기
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

async function getMatchingData(): Promise<MatchingResponse> {
  const response = await fetch('/api/orders/matching', { cache: 'no-store' })
  if (!response.ok) {
    const { error } = (await response.json()) as { error?: string }
    throw new Error(error || '연결 상태를 불러오지 못했어요')
  }
  return response.json()
}
