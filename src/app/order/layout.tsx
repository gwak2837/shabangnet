'use client'

import { Ban, FileText, Link2, Mail } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'

import { AppShell } from '@/components/layout/app-shell'

const orderTabs = [
  {
    href: '/order/sendable',
    label: '발송 대상',
    icon: Mail,
    description: '제조사별 발주서를 생성하고 이메일로 발송하세요',
    variant: 'blue',
  },
  {
    href: '/order/matching',
    label: '발주 준비',
    icon: Link2,
    description: '발주 전에 필요한 연결/설정을 점검해요',
    variant: 'amber',
  },
  {
    href: '/order/excluded',
    label: '발송 제외',
    icon: Ban,
    description: 'F열 값이 제외 패턴과 일치하는 주문 목록입니다',
    variant: 'violet',
  },
  {
    href: '/order/history',
    label: '발송 기록',
    icon: FileText,
    description: '이메일 발송 이력을 확인해요',
    variant: 'slate',
  },
] as const

interface OrderLayoutProps {
  children: ReactNode
}

export default function OrderLayout({ children }: OrderLayoutProps) {
  const pathname = usePathname()
  const currentTab = orderTabs.find((tab) => pathname.startsWith(tab.href)) ?? orderTabs[0]

  return (
    <AppShell description={currentTab.description} title="발주 생성/발송">
      <div className="flex items-center gap-1 mb-6 border-b border-slate-200">
        {orderTabs.map((tab) => {
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              aria-selected={isActive}
              className="relative p-3 sm:px-4 text-sm font-medium transition-colors text-slate-500 hover:text-slate-700 aria-selected:data-[variant=blue]:text-blue-600 aria-selected:data-[variant=amber]:text-amber-700 aria-selected:data-[variant=violet]:text-violet-600 aria-selected:data-[variant=slate]:text-slate-700"
              data-variant={tab.variant}
              href={tab.href}
              key={tab.href}
              title={tab.label}
            >
              <div className="flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </div>
              <div
                aria-hidden="true"
                aria-selected={isActive}
                className="absolute bottom-0 left-0 right-0 h-0.5 opacity-0 aria-selected:opacity-100 data-[variant=blue]:bg-blue-600 data-[variant=amber]:bg-amber-600 data-[variant=violet]:bg-violet-600 data-[variant=slate]:bg-slate-600"
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
