import { Bell, Menu, Search } from 'lucide-react'

import { StatusIndicator } from '@/components/layout/status-indicator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

interface HeaderProps {
  description?: string
  onMenuToggle: () => void
  title: string
}

export function Header({ title, description, onMenuToggle }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur glass-fallback-header md:px-8">
      <div className="flex items-center gap-3">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 md:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
          {description && <p className="hidden text-xs text-slate-500 sm:block">{description}</p>}
        </div>
      </div>
      <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block">
        <StatusIndicator />
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="w-64 border-slate-200 bg-slate-50 pl-9 focus:bg-background"
            placeholder="검색..."
            type="search"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="relative text-slate-600 hover:text-slate-900" size="icon" variant="ghost">
              <Bell className="h-5 w-5" />
              <Badge className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-0 bg-rose-500 p-0 text-xs text-primary-foreground">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>알림</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium text-slate-900">연결 오류 발생</span>
              <span className="text-xs text-slate-500">
                상품코드 &apos;UNKNOWN-123&apos;의 제조사 연결이 필요합니다.
              </span>
              <span className="text-xs text-slate-400">10분 전</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium text-slate-900">발송 완료</span>
              <span className="text-xs text-slate-500">농심식품 발주서가 성공적으로 발송되었습니다.</span>
              <span className="text-xs text-slate-400">30분 전</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="font-medium text-slate-900">업로드 완료</span>
              <span className="text-xs text-slate-500">156건의 주문이 성공적으로 처리되었습니다.</span>
              <span className="text-xs text-slate-400">1시간 전</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
