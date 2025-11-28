'use client'

import { AlertCircle, CheckCircle2, Loader2, Package, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'

import { AppShell } from '@/components/layout'
import { CostUploadModal, ProductFilters, ProductTable } from '@/components/products'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useManufacturers, useProducts, useUpdateProduct } from '@/hooks'

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false)
  const [isCostUploadOpen, setIsCostUploadOpen] = useState(false)

  const { data: products = [], isLoading: isLoadingProducts } = useProducts()
  const { data: manufacturers = [] } = useManufacturers()
  const updateProductMutation = useUpdateProduct()

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.productName.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesUnmapped = showUnmappedOnly ? !p.manufacturerId : true

      return matchesSearch && matchesUnmapped
    })
  }, [products, searchQuery, showUnmappedOnly])

  const handleUpdateManufacturer = (productId: string, manufacturerId: string | null) => {
    const manufacturer = manufacturerId ? manufacturers.find((m) => m.id === manufacturerId) : null
    updateProductMutation.mutate({
      id: productId,
      data: {
        manufacturerId,
        manufacturerName: manufacturer?.name ?? null,
      },
    })
  }

  const handleUpdateCost = (productId: string, cost: number) => {
    updateProductMutation.mutate({
      id: productId,
      data: { cost },
    })
  }

  const handleBulkCostUpload = (
    data: { productCode: string; productName: string; cost: number; shippingFee: number }[],
  ) => {
    // Find product IDs by product codes and update costs
    data.forEach(({ productCode, cost }) => {
      const product = products.find((p) => p.productCode === productCode)
      if (product) {
        updateProductMutation.mutate({
          id: product.id,
          data: { cost },
        })
      }
    })
  }

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = products.length
    const unmappedProducts = products.filter((p) => !p.manufacturerId).length
    const mappedProducts = totalProducts - unmappedProducts
    return { totalProducts, unmappedProducts, mappedProducts }
  }, [products])

  if (isLoadingProducts) {
    return (
      <AppShell description="상품과 제조사 간의 매핑을 관리합니다" title="상품 매핑">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell description="상품과 제조사 간의 매핑을 관리합니다" title="상품 매핑">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
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
              <p className="text-sm text-slate-500">매핑 완료</p>
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
              <p className="text-sm text-slate-500">미매핑</p>
              <p className="text-xl font-semibold text-slate-900">{stats.unmappedProducts}개</p>
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
      <CostUploadModal onOpenChange={setIsCostUploadOpen} onUpload={handleBulkCostUpload} open={isCostUploadOpen} />
    </AppShell>
  )
}
