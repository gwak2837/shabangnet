'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Upload, FileSpreadsheet, Building2, Package, FileText, Settings, LogOut } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const mainNavItems = [
  {
    title: '대시보드',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: '주문 업로드',
    href: '/upload',
    icon: Upload,
  },
  {
    title: '발주 생성',
    href: '/orders',
    icon: FileSpreadsheet,
  },
]

const managementNavItems = [
  {
    title: '제조사 관리',
    href: '/manufacturers',
    icon: Building2,
  },
  {
    title: '상품 매핑',
    href: '/products',
    icon: Package,
  },
  {
    title: '발송 로그',
    href: '/logs',
    icon: FileText,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200 bg-white">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
              <FileSpreadsheet className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">사방넷 발주</span>
              <span className="text-xs text-slate-500">자동화 시스템</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-slate-100 text-slate-900'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                    )}
                  >
                    <item.icon className={cn('h-5 w-5', isActive ? 'text-slate-900' : 'text-slate-500')} />
                    {item.title}
                  </Link>
                )
              })}
            </div>

            <Separator className="my-4" />

            <div className="space-y-1">
              <p className="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-slate-400">관리</p>
              {managementNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                          isActive
                            ? 'bg-slate-100 text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
                        )}
                      >
                        <item.icon className={cn('h-5 w-5', isActive ? 'text-slate-900' : 'text-slate-500')} />
                        {item.title}
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{item.title}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <span className="text-sm font-medium text-slate-700">관</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">관리자</p>
                <p className="truncate text-xs text-slate-500">admin@daonfnc.com</p>
              </div>
            </div>

            <div className="mt-2 flex gap-1">
              <Link
                href="/settings"
                className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <Settings className="h-4 w-4" />
                설정
              </Link>
              <button className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
