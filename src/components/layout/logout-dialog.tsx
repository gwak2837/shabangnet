'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Loader2, LogOut } from 'lucide-react'
import { useTransition } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { authClient } from '@/lib/auth-client'

export function LogoutDialog() {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  async function handleLogout() {
    startTransition(async () => {
      queryClient.clear()
      await authClient.signOut()
      window.location.href = '/login'
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button className="flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900">
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>로그아웃</AlertDialogTitle>
          <AlertDialogDescription>정말 로그아웃하시겠습니까?</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={handleLogout}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그아웃 중...
              </>
            ) : (
              '로그아웃'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
