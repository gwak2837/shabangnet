'use client'

import { CheckCircle2, Copy, Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import type { StepProps } from './common'

interface Props extends StepProps {
  formRef: React.RefObject<HTMLFormElement | null>
  onBack: () => void
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  totpUri: string
}

export function Step3bTOTPSetup({ formRef, isPending, onBack, onSubmit, totpUri }: Props) {
  const [secretCopied, setSecretCopied] = useState(false)

  function extractSecret(uri: string): string {
    const match = uri.match(/secret=([A-Z2-7]+)/i)
    return match ? match[1] : ''
  }

  async function handleCopySecret() {
    const secret = extractSecret(totpUri)
    await navigator.clipboard.writeText(secret)
    setSecretCopied(true)
    setTimeout(() => setSecretCopied(false), 2000)
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="text-center">
        <button
          className="text-xs text-foreground/70 hover:text-foreground hover:underline"
          onClick={onBack}
          type="button"
        >
          ← 다른 방식 선택
        </button>
      </div>
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">인증 앱에서 QR 코드를 스캔하세요</p>
        {totpUri && (
          <div className="flex justify-center">
            <div className="rounded-lg bg-white p-3 shadow-lg">
              <QRCodeSVG size={180} value={totpUri} />
            </div>
          </div>
        )}
        {totpUri && (
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">또는 수동 입력</p>
            <div className="flex items-center gap-2 w-full glass-panel rounded-lg px-3 py-1">
              <code className="flex-1 overflow-x-auto text-xs font-mono tracking-wide select-all whitespace-nowrap scrollbar-none">
                {extractSecret(totpUri)}
              </code>
              <button
                aria-label="비밀키 복사"
                className="shrink-0 p-1.5 rounded-md transition-all duration-200 hover:bg-white/20 text-foreground/60 hover:text-foreground"
                onClick={handleCopySecret}
                type="button"
              >
                {secretCopied ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}
      </div>
      <form className="flex flex-col gap-6" onSubmit={onSubmit} ref={formRef}>
        <div>
          <Label htmlFor="totpCode">인증 코드 입력</Label>
          <Input
            autoComplete="one-time-code"
            autoFocus
            className="mt-2 text-center text-2xl tracking-widest"
            id="totpCode"
            inputMode="numeric"
            maxLength={6}
            minLength={6}
            name="totpCode"
            onChange={(e) => {
              e.target.value = e.target.value.replace(/\D/g, '')
            }}
            pattern="[0-9]{6}"
            placeholder="000000"
            required
            variant="glass"
          />
        </div>
        <Button className="w-full" disabled={isPending} type="submit" variant="glass">
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : '확인'}
        </Button>
      </form>
    </div>
  )
}
