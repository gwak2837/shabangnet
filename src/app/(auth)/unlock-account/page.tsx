import { LockOpen, XCircle } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'

import { unlockAccountAction } from './actions'

export default async function UnlockAccountPage({ searchParams }: PageProps<'/unlock-account'>) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : ''

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="rounded-full bg-red-500/20 p-3">
          <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">링크를 확인해주세요</h1>
        <p className="text-muted-foreground">잠금 해제 링크가 올바르지 않아요</p>
        <Button asChild className="mt-4" variant="glass">
          <Link href="/login">로그인하기</Link>
        </Button>
      </div>
    )
  }

  const result = await unlockAccountAction(token)

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {result.error ? (
        <>
          <div className="rounded-full bg-red-500/20 p-3">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">해제할 수 없어요</h1>
          <div className="glass-button rounded-lg p-4 text-red-700 dark:text-red-300">
            <p>{result.error}</p>
          </div>
          <p className="text-sm text-muted-foreground">링크가 만료됐거나 이미 사용됐어요</p>
        </>
      ) : (
        <>
          <div className="rounded-full bg-emerald-500/20 p-3">
            <LockOpen className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">다시 사용할 수 있어요!</h1>
          <div className="glass-button rounded-lg p-4 text-emerald-700 dark:text-emerald-300">
            <p>{result.success}</p>
          </div>
          <p className="text-sm text-muted-foreground">계정 잠금이 해제됐어요</p>
        </>
      )}
      <Button asChild className="mt-4" variant="glass">
        <Link href="/login">로그인하기</Link>
      </Button>
    </div>
  )
}
