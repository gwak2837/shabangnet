import { redirect } from 'next/navigation'

import { Button } from '@/components/ui/button'

import { verifyEmailToken } from './actions'

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token: string }> }) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">링크를 확인해주세요</h1>
        <p className="mt-3 text-muted-foreground">인증 링크가 올바르지 않아요</p>
      </div>
    )
  }

  const result = await verifyEmailToken(token)

  // 성공 시 리다이렉트
  if (result.success && result.redirectTo) {
    redirect(result.redirectTo)
  }

  return (
    <div className="flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">이메일 확인</h1>
      {result.error ? (
        <>
          <p className="mt-4 text-sm text-destructive">{result.error}</p>
          <Button asChild className="mt-8" variant="glass">
            <a href="/register">다시 가입하기</a>
          </Button>
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-1">
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{result.success}</p>
          <p className="text-sm text-muted-foreground">이메일이 확인됐어요</p>
          <Button asChild className="mt-8" variant="glass">
            <a href="/login">로그인하기</a>
          </Button>
        </div>
      )}
    </div>
  )
}
