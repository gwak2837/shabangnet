'use client'

import { Loader2 } from 'lucide-react'

import { useMFASettings } from '@/hooks/use-settings'

import { MFAForm } from '../mfa-form'
import { SettingsDetailHeader } from '../settings-detail-header'

export default function AccountSettingsPage() {
  const { data: mfaSettings, isLoading } = useMFASettings()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <SettingsDetailHeader backHref="/settings#security" backLabel="보안" />
      <MFAForm settings={mfaSettings} />
    </div>
  )
}
