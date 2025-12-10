import type { MetadataRoute } from 'next'

import { getBaseURL } from '@/common/constants'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseURL = getBaseURL()

  const routes = [
    '',
    '/dashboard',
    '/upload',
    '/order',
    '/manufacturer',
    '/product',
    '/option-mapping',
    '/invoice-convert',
    '/settlement',
    '/log',
    '/settings',
  ]

  return routes.map((route) => ({
    url: `${baseURL}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' || route === '/dashboard' ? 1 : 0.8,
  }))
}
