import { LoginForm } from '@/app/(auth)/login/login-form'

export default function LoginPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">다시 만나서 반가워요</h2>
        <p className="mt-2 text-sm text-muted-foreground">계정에 로그인하고 이어서 진행하세요</p>
      </div>
      <LoginForm />
    </>
  )
}
