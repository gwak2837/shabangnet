'use client'

import { CheckCircle2, Loader2, Lock, Package, Server, ShieldCheck } from 'lucide-react'
import { type FormEvent } from 'react'
import { toast } from 'sonner'

import { queryKeys } from '@/common/constants/query-keys'
import { SettingsIconBadge } from '@/components/settings/settings-icon-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useServerAction } from '@/hooks/use-server-action'
import { authClient } from '@/lib/auth-client'

import { testSMTPAccountConnectionAction, upsertSMTPAccountAction } from './action'
import { useSMTPAccount } from './hook'

export function SMTPAccountCard() {
  const { data: account } = useSMTPAccount()
  const { data: session } = authClient.useSession()

  const [isSavingAccount, saveAccount] = useServerAction(upsertSMTPAccountAction, {
    invalidateKeys: [queryKeys.settings.smtp],
    onSuccess: () => toast.success('이메일 설정이 저장됐어요'),
  })

  const [isTesting, test] = useServerAction(testSMTPAccountConnectionAction, {
    onSuccess: () => toast.success('이메일 서버에 연결됐어요'),
  })

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const data = new FormData(e.currentTarget)
    const host = String(data.get('host'))
    const email = String(data.get('email'))
    const password = String(data.get('password'))
    const fromName = String(data.get('from-name'))

    saveAccount({
      name: '발주서 발송',
      host,
      email,
      port: 587,
      password,
      fromName,
      enabled: true,
    })
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-card p-0 shadow-sm overflow-hidden">
      <header className="px-6 pt-6">
        <div className="flex items-center gap-4">
          <SettingsIconBadge accent="indigo" className="h-10 w-10" icon={Package} />
          <div className="space-y-0.5">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">발주서 발송</h2>
            <p className="text-sm text-muted-foreground">제조사에게 발주서 이메일을 발송합니다</p>
          </div>
        </div>
      </header>
      <form className="p-6 space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor="smtp-host">
              SMTP 서버 주소
            </Label>
            <div className="relative">
              <Server className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                defaultValue={account?.host ?? ''}
                id="smtp-host"
                name="host"
                placeholder="smtp.gmail.com"
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor="smtp-port">
              포트
            </Label>
            <Input className="bg-muted" id="smtp-port" readOnly value="587 (STARTTLS)" />
            <p className="text-xs text-muted-foreground">보안을 위해 587 포트로 고정됩니다</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor="email">
              사용자명 (이메일)
            </Label>
            <Input className="bg-muted" id="email" readOnly value={session?.user.email ?? ''} />
            <p className="text-xs text-muted-foreground">발신자 이메일로도 사용됩니다</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium" htmlFor="smtp-password">
              비밀번호 (앱 비밀번호)
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                id="smtp-password"
                name="password"
                placeholder={account?.hasPassword ? account.maskedPassword : '앱 비밀번호 입력'}
                required={!account?.hasPassword}
                type="password"
              />
            </div>
            {account?.hasPassword && (
              <p className="text-xs text-muted-foreground">비밀번호를 변경하려면 새 비밀번호를 입력하세요</p>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium" htmlFor="smtp-from-name">
            발신자 이름
          </Label>
          <Input
            defaultValue={account?.fromName ?? ''}
            id="smtp-from-name"
            name="from-name"
            placeholder="(주)다온에프앤씨"
          />
          <p className="text-xs text-muted-foreground">수신자에게 표시되는 발신자 이름입니다</p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-4 ring-1 ring-emerald-500/20">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-emerald-600">보안 연결 활성화됨</p>
              <p className="mt-0.5 text-emerald-500">
                모든 이메일은 TLS 암호화 연결(STARTTLS)을 통해 안전하게 발송됩니다.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <Button
            disabled={isTesting || isSavingAccount}
            onClick={() => test(undefined)}
            type="button"
            variant="outline"
          >
            {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
            연결 테스트
          </Button>
          <Button disabled={isSavingAccount || isTesting} type="submit">
            {isSavingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </div>
      </form>
    </section>
  )
}
