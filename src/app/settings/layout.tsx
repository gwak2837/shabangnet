'use client'

import type { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

interface SettingsLayoutProps {
  children: ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  return (
    <AppShell description="원하는 설정을 찾아서 바꿀 수 있어요" title="설정">
      <div className="min-w-0">{children}</div>
    </AppShell>
  )
}
