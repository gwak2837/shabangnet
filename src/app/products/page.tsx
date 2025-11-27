'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/layout'
import { ProductFilters, ProductTable } from '@/components/products'
import { Card, CardContent } from '@/components/ui/card'
import { useProducts, useManufacturers, useUpdateProduct } from '@/hooks'
import type { Product } from '@/lib/mock-data'
import { Package, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false)

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

  // Calculate stats
  const stats = useMemo(() => {
    const totalProducts = products.length
    const unmappedProducts = products.filter((p) => !p.manufacturerId).length
    const mappedProducts = totalProducts - unmappedProducts
    return { totalProducts, unmappedProducts, mappedProducts }
  }, [products])

  if (isLoadingProducts) {
    return (
      <AppShell title="상품 매핑" description="상품과 제조사 간의 매핑을 관리합니다">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="상품 매핑" description="상품과 제조사 간의 매핑을 관리합니다">
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="border-slate-200 bg-white shadow-sm">
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

        <Card className="border-slate-200 bg-white shadow-sm">
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

        <Card className="border-slate-200 bg-white shadow-sm">
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
      <div className="mb-6">
        <ProductFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showUnmappedOnly={showUnmappedOnly}
          onShowUnmappedChange={setShowUnmappedOnly}
        />
      </div>

      {/* Product Table */}
      <ProductTable
        products={filteredProducts}
        manufacturers={manufacturers}
        onUpdateManufacturer={handleUpdateManufacturer}
      />
    </AppShell>
  )
}
