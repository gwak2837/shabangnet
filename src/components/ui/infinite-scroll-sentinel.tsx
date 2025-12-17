'use client'

import { useEffect, useRef } from 'react'
import { useInView } from 'react-intersection-observer'

interface InfiniteScrollSentinelProps {
  disabled?: boolean
  hasMore: boolean
  isLoading?: boolean
  onLoadMore: () => void
  root?: Element | null
  rootMargin?: string
}

export function InfiniteScrollSentinel({
  onLoadMore,
  hasMore,
  isLoading = false,
  disabled = false,
  root = null,
  rootMargin = '300px 0px',
}: InfiniteScrollSentinelProps) {
  const onLoadMoreRef = useRef(onLoadMore)

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore
  }, [onLoadMore])

  const { ref, inView } = useInView({
    root,
    rootMargin,
    threshold: 0,
  })

  useEffect(() => {
    if (disabled || isLoading || !hasMore || !inView) {
      return
    }
    onLoadMoreRef.current()
  }, [disabled, hasMore, inView, isLoading])

  return <div aria-hidden="true" className="h-px w-full" data-slot="infinite-scroll-sentinel" ref={ref} />
}
