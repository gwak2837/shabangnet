'use client'

import { useQuery } from '@tanstack/react-query'
import { Download, Loader2, Upload } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { queryKeys } from '@/common/constants/query-keys'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { InfiniteScrollSentinel } from '@/components/ui/infinite-scroll-sentinel'
import { useManufacturers } from '@/hooks/use-manufacturers'
import { useProducts } from '@/hooks/use-products'
import { useServerAction } from '@/hooks/use-server-action'
import { authClient } from '@/lib/auth-client'
import { saveProductManufacturerLink } from '@/services/product-manufacturer-links'

import { updateProductAction } from './action'
import { DeleteProductsDialog } from './delete-products-dialog'
import { ProductExcelDialog } from './product-excel-dialog'
import { ProductFilters } from './product-filters'
import { ProductTable } from './product-table'
import { ProductStats } from './stats/product-stats'

interface MatchingSummaryResponse {
  missingEmailManufacturers: unknown[]
  unmatchedProductCodes: unknown[]
}

export default function ProductsPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const searchQuery = (searchParams.get('q') ?? '').trim()
  const showUnmappedOnly = searchParams.get('unlinked') === '1'
  const showPriceErrorsOnly = searchParams.get('price-error') === '1'
  const [isExcelDialogOpen, setIsExcelDialogOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<number[]>([])

  const {
    data: productsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingProducts,
  } = useProducts({
    filters: {
      search: searchQuery,
      unmapped: showUnmappedOnly,
      priceError: showPriceErrorsOnly,
    },
  })

  const products = useMemo(() => productsData?.pages.flatMap((page) => page.items) ?? [], [productsData])
  const visibleIds = useMemo(() => products.map((p) => p.id), [products])
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
  })

  const [, updateProduct] = useServerAction(updateProductAction, { invalidateKeys: [queryKeys.products.all] })

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

  function handleUpdateManufacturer(productId: number, manufacturerId: number | null) {
    const target = products.find((p) => p.id === productId)
    if (!target) {
      return
    }

    saveLink({
      manufacturerId,
      productCode: target.productCode,
      productName: target.productName,
    })
  }

  function handleUpdateCost(productId: number, cost: number) {
    updateProduct({
      id: productId,
      data: { cost },
    })
  }

  function handleUpdateShippingFee(productId: number, shippingFee: number) {
    updateProduct({
      id: productId,
      data: { shippingFee },
    })
  }

  function replaceUrl(nextParams: URLSearchParams) {
    const currentSearch = window.location.search
    const nextSearch = nextParams.toString()

    if (nextSearch === currentSearch) {
      return
    }

    router.replace(nextSearch ? `?${nextSearch}` : '/product')
  }

  function updateUrl(updater: (params: URLSearchParams) => void) {
    const nextParams = new URLSearchParams(searchParams)
    updater(nextParams)
    replaceUrl(nextParams)
  }

  function handleTogglePriceErrorsOnly() {
    setSelectedIds([])
    updateUrl((sp) => {
      if (showPriceErrorsOnly) {
        sp.delete('price-error')
      } else {
        sp.set('price-error', '1')
      }
    })
  }

  const productExcelHref = useMemo(() => {
    const sp = new URLSearchParams()
    if (searchQuery) {
      sp.set('search', searchQuery)
    }
    if (showUnmappedOnly) {
      sp.set('unmapped', 'true')
    }
    if (showPriceErrorsOnly) {
      sp.set('price-error', 'true')
    }
    const qs = sp.toString()
    return qs ? `/api/products/excel?${qs}` : '/api/products/excel'
  }, [searchQuery, showUnmappedOnly, showPriceErrorsOnly])

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
      <ProductStats onTogglePriceErrorsOnly={handleTogglePriceErrorsOnly} showPriceErrorsOnly={showPriceErrorsOnly} />

      {/* Filters */}
      <div className="mb-6 flex items-center justify-between">
        <ProductFilters
          onSearchChange={(value) => {
            setSelectedIds([])
            updateUrl((sp) => {
              const nextQ = value.trim()
              if (nextQ.length > 0) {
                sp.set('q', nextQ)
              } else {
                sp.delete('q')
              }
            })
          }}
          onShowUnmappedChange={(value) => {
            setSelectedIds([])
            updateUrl((sp) => {
              if (value) {
                sp.set('unlinked', '1')
              } else {
                sp.delete('unlinked')
              }
            })
          }}
          searchQuery={searchQuery}
          showUnmappedOnly={showUnmappedOnly}
        />
        <div className="flex items-center gap-2">
          {isAdmin && <DeleteProductsDialog onSuccess={handleDeleteSuccess} selectedIds={visibleSelectedIds} />}
          <Button asChild className="gap-2" variant="outline">
            <a href={productExcelHref}>
              <Download className="h-4 w-4" />
              엑셀 다운로드
            </a>
          </Button>
          <Button className="gap-2" onClick={() => setIsExcelDialogOpen(true)}>
            <Upload className="h-4 w-4" />
            엑셀 업로드
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

      <InfiniteScrollSentinel hasMore={hasNextPage} isLoading={isFetchingNextPage} onLoadMore={() => fetchNextPage()} />

      <ProductExcelDialog onOpenChange={setIsExcelDialogOpen} open={isExcelDialogOpen} />
    </AppShell>
  )
}
