'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { type Product, formatCurrency, formatDate, manufacturers } from '@/lib/mock-data'
import { AlertCircle, Check, Package } from 'lucide-react'
import { useState } from 'react'

interface ProductTableProps {
  products: Product[]
  onUpdateManufacturer: (productId: string, manufacturerId: string | null) => void
}

export function ProductTable({ products, onUpdateManufacturer }: ProductTableProps) {
  const [editingProductId, setEditingProductId] = useState<string | null>(null)

  function handleManufacturerChange(productId: string, value: string) {
    onUpdateManufacturer(productId, value === 'none' ? null : value)
    setEditingProductId(null)
  }

  return (
    <Card className="border-slate-200 bg-white shadow-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품코드</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">상품명</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">옵션</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">
                가격
              </TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">제조사</TableHead>
              <TableHead className="text-xs font-medium text-slate-500 uppercase tracking-wider">수정일</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const isUnmapped = !product.manufacturerId
              const isEditing = editingProductId === product.id

              return (
                <TableRow
                  key={product.id}
                  className={`hover:bg-slate-50 transition-colors ${isUnmapped ? 'bg-amber-50/50' : ''}`}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-100">
                        <Package className="h-4 w-4 text-slate-500" />
                      </div>
                      <code className="text-sm font-mono text-slate-700">{product.productCode}</code>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">{product.productName}</TableCell>
                  <TableCell className="text-slate-600">{product.optionName}</TableCell>
                  <TableCell className="text-right font-medium text-slate-900">
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell>
                    {isEditing ? (
                      <Select
                        defaultValue={product.manufacturerId || 'none'}
                        onValueChange={(value) => handleManufacturerChange(product.id, value)}
                      >
                        <SelectTrigger className="w-[180px] h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-slate-500">미지정</span>
                          </SelectItem>
                          {manufacturers.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : isUnmapped ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingProductId(product.id)}
                        className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                      >
                        <AlertCircle className="h-4 w-4" />
                        매핑 필요
                      </Button>
                    ) : (
                      <div
                        className="flex items-center gap-2 cursor-pointer group"
                        onClick={() => setEditingProductId(product.id)}
                      >
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 group-hover:bg-slate-200">
                          {product.manufacturerName}
                        </Badge>
                        <Check className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">{formatDate(product.updatedAt)}</TableCell>
                </TableRow>
              )
            })}
            {products.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  상품이 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
