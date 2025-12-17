'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, Download, Info, Loader2, Package, Upload } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { queryKeys } from '@/common/constants/query-keys'
import { AppShell } from '@/components/layout/app-shell'
import { DeleteProductsDialog } from '@/components/product/delete-products-dialog'
import { ProductCsvDialog } from '@/components/product/product-csv-dialog'
import { ProductFilters } from '@/components/product/product-filters'
import { ProductTable } from '@/components/product/product-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useProducts } from '@/hooks/use-products'
import { useServerAction } from '@/hooks/use-server-action'
import { authClient } from '@/lib/auth-client'
import { saveProductManufacturerLink } from '@/services/product-manufacturer-links'
import { update } from '@/services/products'

interface MatchingSummaryResponse {
  missingEmailManufacturers: unknown[]
  unmatchedProductCodes: unknown[]
}

interface ProductsPageClientProps {
  initialSearchQuery: string
  initialShowUnmappedOnly: boolean
}

export default function ProductsPageClient({ initialSearchQuery, initialShowUnmappedOnly }: ProductsPageClientProps) {
  const [searchQuery, setSearchQuery] = useState(() => initialSearchQuery)
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(() => initialShowUnmappedOnly)
  const [showPriceErrorsOnly, setShowPriceErrorsOnly] = useState(false)
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingProducts,
  } = useProducts({
    filters: {
      search: searchQuery.trim().length > 0 ? searchQuery : undefined,
      unmapped: showUnmappedOnly,
      priceError: showPriceErrorsOnly,
    },
  })
  const products = useMemo(() => productsData?.pages.flatMap((page) => page.items) ?? [], [productsData])
  const { data: manufacturers = [] } = useManufacturers()
  const { data: session } = authClient.useSession()
  const isAdmin = session?.user?.isAdmin ?? false

  const { data: matchingSummary } = useQuery({
    queryKey: queryKeys.orders.matching,
    queryFn: async () => {
      const res = await fetch('/api/orders/matching')
      const json = (await res.json()) as MatchingSummaryResponse & { error?: string }
      if (!res.ok) {
        throw new Error(json.error || '연결 상태를 불러오지 못했어요')
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

  const [, updateProduct] = useServerAction(update, {
    invalidateKeys: [queryKeys.products.all],
    onError: (error) => toast.error(error),
  })

  const visibleIds = useMemo(() => products.map((p) => p.id), [products])

  const visibleSelectedIds = useMemo(() => {
    if (selectedIds.length === 0 || visibleIds.length === 0) {
      return []
    }

    const visibleIdSet = new Set(visibleIds)
    return selectedIds.filter((id) => visibleIdSet.has(id))
  }, [selectedIds, visibleIds])

  const selectionState = useMemo<'all' | 'mixed' | 'none'>(() => {
    if (visibleIds.length === 0) return 'none'
    const selectedCount = visibleSelectedIds.length
    if (selectedCount === 0) return 'none'
    if (selectedCount === visibleIds.length) return 'all'
    return 'mixed'
  }, [visibleIds.length, visibleSelectedIds.length])

  function handleSelectAll(checked: boolean) {
    setSelectedIds(checked ? visibleIds : [])
  }

  function handleSelectItem(id: number, checked: boolean) {
    setSelectedIds((prev) => {
      const visibleIdSet = new Set(visibleIds)
      const prunedPrev = prev.filter((selectedId) => visibleIdSet.has(selectedId))
      if (checked) {
        return prunedPrev.includes(id) ? prunedPrev : [...prunedPrev, id]
      }
      return prunedPrev.filter((selectedId) => selectedId !== id)
    })
  }

  function handleDeleteSuccess() {
    setSelectedIds([])
  }

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

  const handleUpdateShippingFee = (productId: number, shippingFee: number) => {
    updateProduct({
      id: productId,
      data: { shippingFee },
    })
  }

  // Calculate stats
  const stats = useMemo(() => {
    const summary = productsData?.pages[0]?.summary
    return {
      totalProducts: summary?.totalProducts ?? 0,
      unmappedProducts: summary?.unmappedProducts ?? 0,
      mappedProducts: summary?.mappedProducts ?? 0,
      priceErrorProducts: summary?.priceErrorProducts ?? 0,
    }
  }, [productsData?.pages])

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
              <Info className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">미연결</p>
              <p className="text-xl font-semibold text-slate-900">{stats.unmappedProducts}개</p>
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 bg-card shadow-sm cursor-pointer transition-colors ${
            showPriceErrorsOnly ? 'ring-2 ring-rose-500' : ''
          } ${stats.priceErrorProducts > 0 ? 'hover:border-rose-200' : ''}`}
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
        <div className="flex items-center gap-2">
          {isAdmin && <DeleteProductsDialog onSuccess={handleDeleteSuccess} selectedIds={visibleSelectedIds} />}
          <Button asChild className="gap-2" variant="outline">
            <a href="/api/products/csv">
              <Download className="h-4 w-4" />
              CSV 다운로드
            </a>
          </Button>
          <Button className="gap-2" onClick={() => setIsCsvDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            CSV 업로드
          </Button>
        </div>
      </div>

      {/* Product Table */}
      <ProductTable
        isAdmin={isAdmin}
        manufacturers={manufacturers}
        onSelectAll={handleSelectAll}
        onSelectItem={handleSelectItem}
        onUpdateCost={handleUpdateCost}
        onUpdateManufacturer={handleUpdateManufacturer}
        onUpdateShippingFee={handleUpdateShippingFee}
        products={products}
        selectedIds={visibleSelectedIds}
        selectionState={selectionState}
      />

      {isFetchingNextPage ? (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />더 불러오는 중...
        </div>
      ) : null}

      <InfiniteScrollSentinel
        hasMore={hasNextPage ?? false}
        isLoading={isFetchingNextPage}
        onLoadMore={() => fetchNextPage()}
      />

      <ProductCsvDialog onOpenChange={setIsCsvDialogOpen} open={isCsvDialogOpen} />
    </AppShell>
  )
}
