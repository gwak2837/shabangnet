'use client'

import {
  Building2,
  Calculator,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Settings,
  Settings2,
  Truck,
  Upload,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { LogoutDialog } from '@/components/layout/logout-dialog'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { authClient } from '@/lib/auth-client'

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
    href: '/order',
    icon: FileSpreadsheet,
  },
  {
    title: '송장 변환',
    href: '/invoice-convert',
    icon: Truck,
  },
]

const managementNavItems = [
  {
    title: '제조사 관리',
    description: '거래처 연락처, 이메일, 발주 양식 설정',
    href: '/manufacturer',
    icon: Building2,
  },
  {
    title: '상품 연결',
    description: '상품코드 → 제조사 연결',
    href: '/product',
    icon: Package,
  },
  {
    title: '옵션 연결',
    description: '상품코드, 옵션 → 제조사 연결',
    href: '/option',
    icon: Settings2,
  },
  {
    title: '정산 관리',
    description: '제조사별 발주 내역 및 정산서 다운로드',
    href: '/settlement',
    icon: Calculator,
  },
  {
    title: '사용자 관리',
    description: '사용자 가입 승인 및 관리 (관리자 전용)',
    href: '/user',
    icon: Users,
    isAdminOnly: true,
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = authClient.useSession()
  const user = session?.user
  const userName = user?.name || '사용자'
  const userEmail = user?.email || ''
  const isAdmin = user?.isAdmin || false
  const userInitial = userName.charAt(0)

  function isActivePath(href: string): boolean {
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <TooltipProvider>
      {isOpen && <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose} />}
      <aside
        className="fixed left-0 top-0 z-50 h-screen w-64 border-r border-slate-200 bg-slate-50 transition duration-300 ease-in-out motion-reduce:transition-none md:z-40 md:translate-x-0 -translate-x-full data-open:translate-x-0"
        data-open={isOpen || undefined}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
                <FileSpreadsheet className="h-5 w-5 text-slate-50" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-slate-900">사방넷 발주</span>
                <span className="text-xs text-slate-500">자동화 시스템</span>
              </div>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:hidden"
              onClick={onClose}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="flex flex-col gap-1">
              {mainNavItems.map((item) => {
                const isActive = isActivePath(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      aria-current={isActive ? 'page' : undefined}
                      className="relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 aria-[current=page]:bg-slate-200 aria-[current=page]:text-slate-900 aria-[current=page]:before:absolute aria-[current=page]:before:left-0 aria-[current=page]:before:top-1/2 aria-[current=page]:before:h-4 aria-[current=page]:before:-translate-y-1/2 aria-[current=page]:before:w-[2px] aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-slate-400"
                      href={item.href}
                      onClick={onClose}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.title}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <Separator className="my-4 bg-slate-200" />
            <div className="flex flex-col gap-2">
              <p className="px-3 text-xs font-medium text-slate-500">관리</p>
              <ul className="flex flex-col gap-1">
                {managementNavItems.map((item) => {
                  if (item.isAdminOnly && !isAdmin) {
                    return null
                  }

                  const isActive = isActivePath(item.href)

                  return (
                    <li key={item.href}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            aria-current={isActive ? 'page' : undefined}
                            className="relative flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 aria-[current=page]:bg-slate-200 aria-[current=page]:text-slate-900 aria-[current=page]:before:absolute aria-[current=page]:before:left-0 aria-[current=page]:before:top-1/2 aria-[current=page]:before:h-4 aria-[current=page]:before:-translate-y-1/2 aria-[current=page]:before:w-[2px] aria-[current=page]:before:rounded-full aria-[current=page]:before:bg-slate-400"
                            href={item.href}
                            onClick={onClose}
                          >
                            <item.icon className="h-5 w-5" />
                            {item.title}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>{item.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>
          <div className="border-t border-slate-200 p-4">
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                <span className="text-sm font-medium text-slate-700">{userInitial}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">{userName}</p>
                <p className="truncate text-xs text-slate-500">{userEmail}</p>
              </div>
            </div>
            <div className="mt-2 flex gap-1">
              {(() => {
                const isActive = pathname.startsWith('/settings')
                return (
                  <Link
                    aria-current={isActive ? 'page' : undefined}
                    className="relative flex h-10 flex-1 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-50 aria-[current=page]:bg-slate-200 aria-[current=page]:text-slate-900"
                    href="/settings"
                    onClick={onClose}
                  >
                    <Settings className="h-4 w-4" />
                    설정
                  </Link>
                )
              })()}
              <LogoutDialog />
            </div>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  )
}
