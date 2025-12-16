'use client'

import { ChevronDown, Mail, Package, Shield } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode, useState } from 'react'

import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { cn } from '@/utils/cn'

const settingsNavItems = [
  {
    title: '주문 처리',
    description: '택배사, 쇼핑몰, 중복 체크, 제외',
    href: '/settings/order',
    icon: Package,
  },
  {
    title: '이메일',
    description: 'SMTP, 템플릿, 발송 로그',
    href: '/settings/email',
    icon: Mail,
  },
  {
    title: '계정',
    description: '이메일 인증 및 보안',
    href: '/settings/account',
    icon: Shield,
  },
]

interface SettingsLayoutProps {
  children: ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const pathname = usePathname()

  const currentItem = settingsNavItems.find((item) => pathname.startsWith(item.href)) ?? settingsNavItems[0]

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex flex-1 flex-col pl-0 md:pl-64">
        <Header description="시스템 설정을 관리합니다" onMenuToggle={() => setIsSidebarOpen(true)} title="설정" />
        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="border-b bg-card p-4 lg:hidden">
            <button
              className="flex w-full items-center justify-between rounded-lg border bg-secondary px-4 py-3 text-left transition-colors hover:bg-accent"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            >
              <div className="flex items-center gap-3">
                <currentItem.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{currentItem.title}</p>
                  <p className="text-xs text-muted-foreground">{currentItem.description}</p>
                </div>
              </div>
              <ChevronDown
                className={cn('h-5 w-5 text-muted-foreground transition-transform', isMobileNavOpen && 'rotate-180')}
              />
            </button>
            {isMobileNavOpen && (
              <nav className="mt-2 flex flex-col gap-1 rounded-lg border bg-card p-2">
                {settingsNavItems.map((item) => {
                  const isActive = pathname.startsWith(item.href)
                  return (
                    <Link
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                      )}
                      href={item.href}
                      key={item.href}
                      onClick={() => setIsMobileNavOpen(false)}
                    >
                      <item.icon
                        className={cn('h-5 w-5', isActive ? 'text-accent-foreground' : 'text-muted-foreground')}
                      />
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </Link>
                  )
                })}
              </nav>
            )}
          </div>
          <aside className="hidden w-64 shrink-0 border-r bg-card lg:block">
            <nav className="sticky top-16 flex flex-col gap-1 p-4">
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">설정 메뉴</p>
              {settingsNavItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors',
                      isActive
                        ? 'bg-accent text-accent-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    )}
                    href={item.href}
                    key={item.href}
                  >
                    <item.icon
                      className={cn('h-5 w-5', isActive ? 'text-accent-foreground' : 'text-muted-foreground')}
                    />
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  </Link>
                )
              })}
            </nav>
          </aside>
          <main className="flex-1 p-4 min-w-0 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  )
}
