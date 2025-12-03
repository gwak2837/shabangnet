'use client'

import { Loader2 } from 'lucide-react'

import { EmailVerificationForm } from '@/components/settings/email-verification-form'
import { MfaForm } from '@/components/settings/mfa-form'
import { useMfaSettings } from '@/hooks/use-settings'

export default function AccountSettingsPage() {
  const { data: mfaSettings, isLoading } = useMfaSettings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <EmailVerificationForm />
      <MfaForm settings={mfaSettings} />
    </div>
  )
}
