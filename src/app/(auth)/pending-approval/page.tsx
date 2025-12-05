'use client'

import { Clock, LogOut } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth-client'

export default function PendingApprovalPage() {
  async function handleLogout() {
    await authClient.signOut()
    window.location.href = '/login'
  }

  return (
    <div className="flex flex-col gap-8 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/20">
        <Clock className="h-10 w-10 text-amber-600 dark:text-amber-400" />
      </div>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">거의 다 됐어요!</h1>
        <p className="text-muted-foreground">
          가입이 완료됐어요.
          <br />
          관리자 승인 후 바로 시작할 수 있어요.
        </p>
      </div>

      <div className="glass-panel rounded-lg p-4 text-left text-sm">
        <p className="font-medium text-foreground/90">승인 후 이용 가능한 기능</p>
        <ul className="mt-2 flex flex-col gap-1 text-muted-foreground">
          <li>• 대시보드 접근</li>
          <li>• 주문 관리</li>
          <li>• 발주서 변환</li>
          <li>• 설정 변경</li>
        </ul>
      </div>

      <p className="text-sm text-muted-foreground">문의사항이 있으시면 관리자에게 연락해주세요.</p>

      <Button className="w-full" onClick={handleLogout} variant="glass-outline">
        <LogOut className="mr-2 h-4 w-4" />
        로그아웃
      </Button>
    </div>
  )
}
