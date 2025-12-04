import { XCircle } from 'lucide-react'
import Link from 'next/link'

import { validateResetToken } from '@/app/(auth)/reset-password/actions'
import { ResetPasswordForm } from '@/app/(auth)/reset-password/reset-password-form'

export default async function ResetPasswordPage({ searchParams }: PageProps<'/reset-password'>) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : ''

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center flex flex-col gap-4 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">링크를 확인해주세요</h1>
        <p className="text-muted-foreground">비밀번호 재설정 링크가 올바르지 않아요</p>
        <Link
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          href="/forgot-password"
        >
          비밀번호 찾기로 이동
        </Link>
      </div>
    )
  }

  const { valid, error } = await validateResetToken(token)

  if (!valid) {
    return (
      <div className="flex flex-col items-center justify-center flex flex-col gap-4 text-center">
        <div className="rounded-full bg-red-100 p-3">
          <XCircle className="h-8 w-8 text-red-600" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground">링크가 만료됐어요</h1>
        <div className="glass-button rounded-lg p-4 text-red-700 dark:text-red-300">
          <p>{error}</p>
        </div>
        <p className="text-sm text-muted-foreground">새로운 재설정 링크를 받아보세요</p>
        <Link
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
          href="/forgot-password"
        >
          다시 비밀번호 찾기
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">새 비밀번호 설정</h2>
        <p className="mt-2 text-sm text-muted-foreground">기억하기 쉬운 안전한 비밀번호를 만들어주세요</p>
      </div>
      <ResetPasswordForm token={token} />
    </>
  )
}
