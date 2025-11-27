import type { MetadataRoute } from 'next'

import { SITE_CONFIG } from '@/lib/constants'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_CONFIG.name,
    short_name: SITE_CONFIG.shortName,
    description: SITE_CONFIG.description,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: SITE_CONFIG.themeColor,
    lang: 'ko',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/web-app-manifest-144x144.png',
        sizes: '144x144',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/web-app-manifest-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
