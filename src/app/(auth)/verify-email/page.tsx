import { redirect } from 'next/navigation'

import { verifyEmailToken } from './actions'

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token: string }> }) {
  const params = await searchParams
  const token = params.token

  if (!token) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">잘못된 요청</h1>
        <p className="mt-3 text-muted-foreground">인증 토큰이 없습니다.</p>
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
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">이메일 인증</h1>
      {result.error ? (
        <>
          <p className="mt-4 text-sm text-destructive">{result.error}</p>
          <a
            className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80 active:opacity-70"
            href="/register"
          >
            회원가입으로 돌아가기
          </a>
        </>
      ) : (
        <div className="mt-4 space-y-1">
          <p className="text-sm text-emerald-600">{result.success}</p>
          <p className="text-sm text-muted-foreground">계정이 인증되었습니다.</p>
          <a
            className="mt-8 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-80 active:opacity-70"
            href="/login"
          >
            로그인으로 이동
          </a>
        </div>
      )}
    </div>
  )
}
