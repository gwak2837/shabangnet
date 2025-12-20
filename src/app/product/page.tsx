import { Suspense } from 'react'

import ProductsPageClient from './products-page-client'

export default async function ProductsPage() {
  return (
    <Suspense>
      <ProductsPageClient />
    </Suspense>
  )
}
