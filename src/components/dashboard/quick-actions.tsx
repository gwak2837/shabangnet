'use client'

import { ArrowRight, Building2, FileSpreadsheet, Upload } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const actions = [
  {
    title: '주문 업로드',
    description: '사방넷 엑셀 파일을 업로드하세요',
    href: '/upload',
    icon: Upload,
    color: 'bg-blue-50 text-blue-600',
  },
  {
    title: '발주 생성',
    description: '제조사별 발주서를 생성하세요',
    href: '/orders',
    icon: FileSpreadsheet,
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    title: '제조사 관리',
    description: '제조사 정보를 관리하세요',
    href: '/manufacturers',
    icon: Building2,
    color: 'bg-purple-50 text-purple-600',
  },
]

export function QuickActions() {
  return (
    <Card className="border-slate-200 bg-white shadow-sm py-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold text-slate-900">빠른 실행</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid gap-3">
          {actions.map((action) => (
            <Link href={action.href} key={action.href}>
              <Button
                className="w-full justify-between h-auto p-4 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all group"
                variant="outline"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-slate-900">{action.title}</p>
                    <p className="text-sm text-slate-500">{action.description}</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
