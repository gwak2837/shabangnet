import { RegisterForm } from '@/app/(auth)/register/register-form'
import { SocialButtons } from '@/app/(auth)/social-buttons'
import { Separator } from '@/components/ui/separator'

export default function RegisterPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">회원가입</h2>
      </div>
      <RegisterForm />
      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <Separator />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-2 text-muted-foreground">소셜 계정으로 가입</span>
          </div>
        </div>
        <SocialButtons />
      </div>
    </>
  )
}
