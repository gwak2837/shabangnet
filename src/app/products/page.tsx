'use client'

import { useState, useMemo } from 'react'
import { AppShell } from '@/components/layout'
import { ProductFilters, ProductTable } from '@/components/products'
import { Card, CardContent } from '@/components/ui/card'
import { products as initialProducts, type Product } from '@/lib/mock-data'
import { Package, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function ProductsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showUnmappedOnly, setShowUnmappedOnly] = useState(false)
  const [products, setProducts] = useState<Product[]>(initialProducts)

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
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const manufacturer = manufacturerId
            ? initialProducts.find((prod) => prod.manufacturerId === manufacturerId) || { manufacturerName: '농심식품' } // fallback
            : null
          return {
            ...p,
            manufacturerId,
            manufacturerName: manufacturerId ? manufacturer?.manufacturerName || null : null,
            updatedAt: new Date().toISOString(),
          }
        }
        return p
      }),
    )
  }

  // Calculate stats
  const totalProducts = products.length
  const unmappedProducts = products.filter((p) => !p.manufacturerId).length
  const mappedProducts = totalProducts - unmappedProducts

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
              <p className="text-xl font-semibold text-slate-900">{totalProducts}개</p>
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
              <p className="text-xl font-semibold text-slate-900">{mappedProducts}개</p>
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
              <p className="text-xl font-semibold text-slate-900">{unmappedProducts}개</p>
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
      <ProductTable products={filteredProducts} onUpdateManufacturer={handleUpdateManufacturer} />
    </AppShell>
  )
}
