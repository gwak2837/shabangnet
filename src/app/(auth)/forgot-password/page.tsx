import { ForgotPasswordForm } from '@/app/(auth)/forgot-password/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">비밀번호 찾기</h2>
        <p className="mt-2 text-sm text-muted-foreground">가입했던 이메일 주소를 입력하면 재설정 링크를 보내드려요</p>
      </div>
      <ForgotPasswordForm />
    </>
  )
}
