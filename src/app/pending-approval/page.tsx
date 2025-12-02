'use client'

import { Clock, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { signOut } from '@/lib/auth-client'

export default function PendingApprovalPage() {
  async function handleLogout() {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = '/login'
        },
      },
    })
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Clock className="h-10 w-10 text-amber-600" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">승인 대기 중</h1>
          <p className="text-muted-foreground">
            회원가입이 완료됐어요.
            <br />
            관리자 승인 후 서비스를 이용할 수 있어요.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 text-left text-sm">
          <p className="font-medium text-slate-700">승인 후 이용 가능한 기능</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• 대시보드 접근</li>
            <li>• 주문 관리</li>
            <li>• 발주서 변환</li>
            <li>• 설정 변경</li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">문의사항이 있으시면 관리자에게 연락해주세요.</p>

        <Button className="w-full" onClick={handleLogout} variant="outline">
          <LogOut className="mr-2 h-4 w-4" />
          로그아웃
        </Button>
      </div>
    </div>
  )
}
