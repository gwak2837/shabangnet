import { RegisterForm } from '@/app/(auth)/register/register-form'

export default function RegisterPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">시작해볼까요?</h2>
        <p className="mt-2 text-sm text-muted-foreground">계정을 만들고 우리와 함께하세요</p>
      </div>
      <RegisterForm />
    </>
  )
}
