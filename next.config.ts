import type { NextConfig } from 'next'

import { createCacheControl } from '@/utils/cache-control'
import { sec } from '@/utils/sec'

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' https:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  object-src 'none';
  connect-src 'self' https: http:;
  frame-src 'self' https:;
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

const cacheControlHeaders = [
  {
    key: 'Cache-Control',
    value: createCacheControl({
      public: true,
      maxAge: 3,
      sMaxAge: sec('1 year'),
    }),
  },
]

const nextConfig: NextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        {
          key: 'Strict-Transport-Security',
          value: `max-age=${sec('2 years')}; includeSubDomains; preload`,
        },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        {
          key: 'Content-Security-Policy',
          value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
        },
      ],
    },
    {
      source: '/sw.js',
      headers: [
        ...cacheControlHeaders,
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
      ],
    },
  ],
  poweredByHeader: false,
  reactCompiler: true,
  ...(process.env.NODE_ENV === 'production' && { compiler: { removeConsole: { exclude: ['error', 'warn'] } } }),
}

export default nextConfig
