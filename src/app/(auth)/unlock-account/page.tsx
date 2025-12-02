import { LockOpen, XCircle } from 'lucide-react'
import Link from 'next/link'

import { unlockAccountAction } from './actions'

export default async function UnlockAccountPage({ searchParams }: PageProps<'/unlock-account'>) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : ''

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center flex flex-col gap-4 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">잘못된 요청</h1>
        <p className="text-muted-foreground">잠금 해제 토큰이 없어요.</p>
        <Link
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          href="/login"
        >
          로그인하기
        </Link>
      </div>
    )
  }

  const result = await unlockAccountAction(token)

  return (
    <div className="flex flex-col items-center justify-center flex flex-col gap-4 text-center">
      {result.error ? (
        <>
          <div className="rounded-full bg-red-100 p-3">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">잠금 해제 실패</h1>
          <div className="rounded-md bg-red-50 p-4 text-red-700">
            <p>{result.error}</p>
          </div>
          <p className="text-sm text-muted-foreground">링크가 만료되었거나 이미 사용됐어요.</p>
        </>
      ) : (
        <>
          <div className="rounded-full bg-emerald-100 p-3">
            <LockOpen className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">계정 잠금 해제 완료</h1>
          <div className="rounded-md bg-emerald-50 p-4 text-emerald-700">
            <p>{result.success}</p>
          </div>
          <p className="text-sm text-muted-foreground">이제 정상적으로 로그인할 수 있어요.</p>
        </>
      )}
      <Link
        className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
        href="/login"
      >
        로그인하기
      </Link>
    </div>
  )
}
