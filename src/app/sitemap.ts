import type { MetadataRoute } from 'next'

import { SITE_CONFIG } from '@/common/constants'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = SITE_CONFIG.url

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
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' || route === '/dashboard' ? 1 : 0.8,
  }))
}
