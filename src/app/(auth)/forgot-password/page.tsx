import { ForgotPasswordForm } from '@/app/(auth)/forgot-password/forgot-password-form'

export default function ForgotPasswordPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">비밀번호를 잊으셨나요?</h2>
        <p className="mt-2 text-sm text-muted-foreground">이메일을 입력하면 재설정 링크를 보내드릴게요</p>
      </div>
      <ForgotPasswordForm />
    </>
  )
}
