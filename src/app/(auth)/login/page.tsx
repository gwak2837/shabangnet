import { LoginForm } from '@/app/(auth)/login/login-form'

export default function LoginPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">로그인</h2>
      </div>
      <LoginForm />
    </>
  )
}
