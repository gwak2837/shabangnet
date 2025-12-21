'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Info, Package } from 'lucide-react'

import { queryKeys } from '@/common/constants/query-keys'
import { Card, CardContent } from '@/components/ui/card'

interface ProductStatsProps {
  onTogglePriceErrorsOnly: () => void
  showPriceErrorsOnly: boolean
}

interface ProductSummary {
  mappedProducts: number
  priceErrorProducts: number
  totalProducts: number
  unmappedProducts: number
}

interface StatValueProps {
  isLoading: boolean
  suffix: string
  value: number | null | undefined
}

export function ProductStats({ showPriceErrorsOnly, onTogglePriceErrorsOnly }: ProductStatsProps) {
  const { data, isLoading, isError } = useProductSummary()
  const totalProducts = !isError ? data?.totalProducts : null
  const unmappedProducts = !isError ? data?.unmappedProducts : null
  const mappedProducts = !isError ? data?.mappedProducts : null
  const priceErrorProducts = !isError ? data?.priceErrorProducts : null
  const hasPriceErrors = (priceErrorProducts ?? 0) > 0
  const canTogglePriceErrorsOnly = !isLoading && hasPriceErrors

  return (
    <div aria-busy={isLoading} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
            <Package className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">전체 상품</p>
            <StatValue isLoading={isLoading} suffix="개" value={totalProducts} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">연결 완료</p>
            <StatValue isLoading={isLoading} suffix="개" value={mappedProducts} />
          </div>
        </CardContent>
      </Card>

      <Card className="border-slate-200 bg-card shadow-sm">
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
            <Info className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">미연결</p>
            <StatValue isLoading={isLoading} suffix="개" value={unmappedProducts} />
          </div>
        </CardContent>
      </Card>

      <Card
        className="border-slate-200 bg-card shadow-sm transition-colors data-[clickable=true]:cursor-pointer data-[show-price-errors-only=true]:ring-2 data-[show-price-errors-only=true]:ring-rose-500 data-[clickable=true]:hover:border-rose-200"
        data-clickable={canTogglePriceErrorsOnly}
        data-show-price-errors-only={showPriceErrorsOnly}
        onClick={() => {
          if (!canTogglePriceErrorsOnly) return
          onTogglePriceErrorsOnly()
        }}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">원가 이상</p>
            {isLoading ? (
              <div className="h-7 w-16 rounded bg-slate-200/80 animate-pulse" />
            ) : priceErrorProducts == null ? (
              <p className="text-xl font-semibold text-slate-400">—</p>
            ) : (
              <p
                className="text-xl font-semibold data-[has-price-errors=true]:text-rose-600 data-[has-price-errors=false]:text-slate-900"
                data-has-price-errors={hasPriceErrors}
              >
                {priceErrorProducts}개
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatValue({ isLoading, suffix, value }: StatValueProps) {
  if (isLoading) {
    return <div className="h-7 w-16 rounded bg-slate-200/80 animate-pulse" />
  }

  if (value == null) {
    return <p className="text-xl font-semibold text-slate-400">—</p>
  }

  return (
    <p className="text-xl font-semibold text-slate-900">
      {value}
      {suffix}
    </p>
  )
}

function useProductSummary() {
  return useQuery({
    queryKey: queryKeys.products.summary,
    queryFn: async (): Promise<ProductSummary> => {
      const response = await fetch('/api/products/summary', { cache: 'no-store' })
      const json = (await response.json()) as unknown

      if (!response.ok) {
        const errorMessage =
          typeof json === 'object' && json !== null && 'error' in json
            ? String((json as { error?: unknown }).error)
            : ''
        throw new Error(errorMessage || '통계를 불러오지 못했어요')
      }

      return json as ProductSummary
    },
  })
}
