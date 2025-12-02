'use client'

import { AlertTriangle, CheckCircle2, Loader2, Mail } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

import { getEmailVerificationStatus, sendVerificationEmail } from './actions/email'

interface EmailVerificationStatus {
  email: string
  emailVerified: boolean
}

export function EmailVerificationForm() {
  const [status, setStatus] = useState<EmailVerificationStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    setIsLoading(true)
    try {
      const result = await getEmailVerificationStatus()
      setStatus(result)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendEmail() {
    setIsSending(true)
    setMessage(null)

    try {
      const result = await sendVerificationEmail()

      if (result.error) {
        setMessage({ type: 'error', text: result.error })
      } else if (result.success) {
        setMessage({ type: 'success', text: result.success })
      }
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-slate-200 bg-card shadow-sm py-6">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    )
  }

  const isVerified = status?.emailVerified ?? false

  return (
    <Card className="border-slate-200 bg-card shadow-sm py-6">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${isVerified ? 'bg-emerald-50' : 'bg-amber-50'}`}
          >
            <Mail className={`h-5 w-5 ${isVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <CardTitle className="text-lg">이메일 인증</CardTitle>
            <CardDescription>
              {isVerified ? '이메일이 인증됐어요' : '비밀번호 재설정을 위해 이메일 인증이 필요해요'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {message && (
          <div
            className={`flex items-center gap-2 rounded-md p-3 text-sm ${
              message.type === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-emerald-50 text-emerald-600'
            }`}
          >
            {message.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            {message.text}
          </div>
        )}

        <div className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium">{status?.email}</p>
            {isVerified ? (
              <p className="flex items-center gap-1.5 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                인증됨
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                인증되지 않음
              </p>
            )}
          </div>
          {!isVerified && (
            <Button disabled={isSending} onClick={handleSendEmail} size="sm">
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : '인증 이메일 보내기'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
