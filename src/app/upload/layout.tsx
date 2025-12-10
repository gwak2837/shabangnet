'use client'

import { FileSpreadsheet, History, Store } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

const uploadTabs = [
  {
    href: '/upload/sabangnet',
    label: '사방넷 주문',
    icon: FileSpreadsheet,
    description: '사방넷에서 다운로드한 주문 엑셀 파일을 업로드하세요',
    variant: 'blue',
  },
  {
    href: '/upload/shopping-mall',
    label: '쇼핑몰 주문',
    icon: Store,
    description: '쇼핑몰에서 다운로드한 주문 파일을 사방넷 양식으로 변환해요',
    variant: 'violet',
  },
  {
    href: '/upload/history',
    label: '업로드 기록',
    icon: History,
    description: '업로드한 파일 기록을 확인하고 관리해요',
    variant: 'slate',
  },
] as const

interface UploadLayoutProps {
  children: ReactNode
}

export default function UploadLayout({ children }: UploadLayoutProps) {
  const pathname = usePathname()
  const currentTab = uploadTabs.find((tab) => pathname.startsWith(tab.href)) ?? uploadTabs[0]

  return (
    <AppShell description={currentTab.description} title="주문 업로드">
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {uploadTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              aria-selected={isActive}
              className="relative p-3 sm:px-4 text-sm font-medium transition-colors text-slate-500 hover:text-slate-700 aria-selected:data-[variant=blue]:text-blue-600 aria-selected:data-[variant=violet]:text-violet-600 aria-selected:data-[variant=slate]:text-slate-700"
              data-variant={tab.variant}
              href={tab.href}
              key={tab.href}
              title={tab.label}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="h-5 w-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </div>
              <div
                aria-hidden="true"
                aria-selected={isActive}
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 aria-selected:opacity-100 data-[variant=blue]:bg-blue-600 data-[variant=violet]:bg-violet-600 data-[variant=slate]:bg-slate-600"
                data-variant={tab.variant}
              />
            </Link>
          )
        })}
      </div>
      {children}
    </AppShell>
  )
}
