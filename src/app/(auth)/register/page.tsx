import { RegisterForm } from '@/app/(auth)/register/register-form'

export default function RegisterPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">회원가입</h2>
      </div>
      <RegisterForm />
    </>
  )
}
