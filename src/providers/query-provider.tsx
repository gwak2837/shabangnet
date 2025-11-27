'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ms from 'ms'
import { type ReactNode, useState } from 'react'

interface QueryProviderProps {
  children: ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: ms('10 minutes'),
            gcTime: ms('20 minutes'),
            refetchOnWindowFocus: false,
            retryDelay: (attemptIndex) => Math.min(100 * 2 ** attemptIndex, 5000),
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
