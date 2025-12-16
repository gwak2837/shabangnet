import ProductsPageClient from './products-page-client'

type PageSearchParams = Record<string, string | string[] | undefined>

export default function ProductsPage({ searchParams }: { searchParams?: PageSearchParams }) {
  const q = getFirstString(searchParams?.q) ?? ''
  const unlinked = getFirstString(searchParams?.unlinked)

  return <ProductsPageClient initialSearchQuery={q.trim()} initialShowUnmappedOnly={unlinked === '1'} />
}

function getFirstString(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}
