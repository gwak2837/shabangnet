'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertCircle, AlertTriangle, CheckCircle2, Loader2, Package, Upload } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { Product } from '@/services/products'

import { queryKeys } from '@/common/constants/query-keys'
import { AppShell } from '@/components/layout/app-shell'
import { CostUploadModal } from '@/components/product/cost-upload-modal'
import { ProductFilters } from '@/components/product/product-filters'
import { ProductTable } from '@/components/product/product-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useProducts } from '@/hooks/use-products'
import { useServerAction } from '@/hooks/use-server-action'
import { saveProductManufacturerLink } from '@/services/product-manufacturer-links'
import { create, update } from '@/services/products'

interface MatchingSummaryResponse {
  missingEmailManufacturers: unknown[]
  unmatchedProductCodes: unknown[]
}

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false)
  const [showPriceErrorsOnly, setShowPriceErrorsOnly] = useState(false)
  const [isCostUploadOpen, setIsCostUploadOpen] = useState(false)

  const { data: products = [], isLoading: isLoadingProducts } = useProducts()
  const { data: manufacturers = [] } = useManufacturers()

  // Deep link 지원: /product?unlinked=1&q=...
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const unlinked = searchParams.get('unlinked')
    const q = searchParams.get('q')

    if (unlinked === '1') {
      setShowUnmappedOnly(true)
    }
    if (q && q.trim().length > 0) {
      setSearchQuery(q)
    }
  }, [])

  const { data: matchingSummary } = useQuery({
    queryKey: queryKeys.orders.matching,
    queryFn: async () => {
      const res = await fetch('/api/orders/matching', { cache: 'no-store' })
      const json = (await res.json()) as MatchingSummaryResponse & { error?: string }
      if (!res.ok) {
        throw new Error(json.error || '매칭 상태를 불러오지 못했어요')
      }
      return json
    },
  })

  const hasOrderPrepIssues =
    (matchingSummary?.missingEmailManufacturers?.length ?? 0) > 0 ||
    (matchingSummary?.unmatchedProductCodes?.length ?? 0) > 0

  const [, saveLink] = useServerAction(saveProductManufacturerLink, {
    invalidateKeys: [queryKeys.products.all, queryKeys.orders.batches, queryKeys.orders.matching],
    onSuccess: (result) => {
      if (result && typeof result === 'object' && 'mode' in result && result.mode === 'unlink') {
        toast.success('제조사 연결이 해제됐어요')
        return
      }

      const updatedOrders =
        result && typeof result === 'object' && 'updatedOrders' in result ? Number(result.updatedOrders ?? 0) : 0

      if (Number.isFinite(updatedOrders) && updatedOrders > 0) {
        toast.success(`기존 주문 ${updatedOrders}건에 반영됐어요`)
      } else {
        toast.success('제조사 연결이 저장됐어요')
      }
    },
    onError: (error) => toast.error(error),
  })

  const [, updateProduct] = useServerAction(
    ({ id, data }: { id: number; data: Partial<Product> }) => update(id, data),
    {
      invalidateKeys: [queryKeys.products.all],
      onError: (error) => toast.error(error),
    },
  )

  const [, createProduct] = useServerAction(create, {
    invalidateKeys: [queryKeys.products.all],
    onSuccess: () => toast.success('상품이 등록되었습니다'),
    onError: (error) => toast.error(error),
  })

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesUnmapped = showUnmappedOnly ? !p.manufacturerId : true
      const matchesPriceError = showPriceErrorsOnly ? hasPriceValidationError(p) : true

      return matchesSearch && matchesUnmapped && matchesPriceError
    })
  }, [products, searchQuery, showUnmappedOnly, showPriceErrorsOnly])

  const handleUpdateManufacturer = (productId: number, manufacturerId: number | null) => {
    const target = products.find((p) => p.id === productId)
    if (!target) return

    saveLink({
      manufacturerId,
      productCode: target.productCode,
      productName: target.productName,
    })
  }

  const handleUpdateCost = (productId: number, cost: number) => {
    updateProduct({
      id: productId,
      data: { cost },
    })
  }

  const handleBulkUpload = (
    data: {
      productCode: string
      productName: string
      optionName: string
      manufacturerId: number | null
      manufacturerName: string
      cost: number
      shippingFee: number
    }[],
  ) => {
    data.forEach(({ productCode, productName, optionName, manufacturerId, cost }) => {
      const existingProduct = products.find((p) => p.productCode === productCode)
      const manufacturer = manufacturerId ? manufacturers.find((m) => m.id === manufacturerId) : null

      if (existingProduct) {
        // 기존 상품 업데이트 - 값이 있는 필드만 업데이트
        const updateData: Partial<Product> = {}
        if (productName) updateData.productName = productName
        if (optionName) updateData.optionName = optionName
        if (manufacturerId !== null) {
          updateData.manufacturerId = manufacturerId
          updateData.manufacturerName = manufacturer?.name ?? null
        }
        if (cost > 0) updateData.cost = cost

        if (Object.keys(updateData).length > 0) {
          updateProduct({
            id: existingProduct.id,
            data: updateData,
          })
        }
      } else {
        // 새 상품 생성
        createProduct({
          productCode,
          productName: productName || '',
          optionName: optionName || '',
          manufacturerId,
          manufacturerName: manufacturer?.name ?? null,
          price: 0,
          cost: cost || 0,
        })
      }
    })
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = products.length
    const unmappedProducts = products.filter((p) => !p.manufacturerId).length
    const mappedProducts = totalProducts - unmappedProducts
    const priceErrorProducts = products.filter(hasPriceValidationError).length
    return { totalProducts, unmappedProducts, mappedProducts, priceErrorProducts }
  }, [products])

  if (isLoadingProducts) {
    return (
      <AppShell description="상품코드와 제조사를 연결하고 원가를 관리해요" title="상품 연결">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="상품코드와 제조사를 연결하고 원가를 관리해요" title="상품 연결">
      {hasOrderPrepIssues && (
        <Card className="border-amber-200 bg-amber-50/50 shadow-sm mb-6">
          <CardContent className="p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-medium text-slate-900">발주 준비가 더 필요해요</p>
              <p className="mt-1 text-sm text-slate-600">
                이메일 미설정 제조사 또는 주문 기준 미연결 항목이 있어요. 발주 준비에서 한 번에 정리할 수 있어요.
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/order/matching">발주 준비로 이동</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">전체 상품</p>
              <p className="text-xl font-semibold text-slate-900">{stats.totalProducts}개</p>
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
              <p className="text-xl font-semibold text-slate-900">{stats.mappedProducts}개</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-card shadow-sm">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">미연결</p>
              <p className="text-xl font-semibold text-slate-900">{stats.unmappedProducts}개</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 bg-card shadow-sm cursor-pointer transition-colors ${showPriceErrorsOnly ? 'ring-2 ring-rose-500' : ''} ${stats.priceErrorProducts > 0 ? 'hover:border-rose-200' : ''}`}
          onClick={() => stats.priceErrorProducts > 0 && setShowPriceErrorsOnly(!showPriceErrorsOnly)}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-50">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">원가 이상</p>
              <p
                className={`text-xl font-semibold ${stats.priceErrorProducts > 0 ? 'text-rose-600' : 'text-slate-900'}`}
              >
                {stats.priceErrorProducts}개
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center justify-between">
        <ProductFilters
          onSearchChange={setSearchQuery}
          onShowUnmappedChange={setShowUnmappedOnly}
          searchQuery={searchQuery}
          showUnmappedOnly={showUnmappedOnly}
        />
        <Button className="gap-2" onClick={() => setIsCostUploadOpen(true)}>
          <Upload className="h-4 w-4" />
          원가 일괄 업로드
        </Button>
      </div>

      {/* Product Table */}
      <ProductTable
        manufacturers={manufacturers}
        onUpdateCost={handleUpdateCost}
        onUpdateManufacturer={handleUpdateManufacturer}
        products={filteredProducts}
      />

      {/* Cost Upload Modal */}
      <CostUploadModal
        manufacturers={manufacturers}
        onOpenChange={setIsCostUploadOpen}
        onUpload={handleBulkUpload}
        open={isCostUploadOpen}
      />
    </AppShell>
  )
}

// 원가가 판매가보다 높은지 검증
function hasPriceValidationError(product: Product): boolean {
  return product.cost > 0 && product.price > 0 && product.cost > product.price
}
