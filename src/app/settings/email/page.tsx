'use client'

import { EmailLogsViewer } from '@/components/settings/email-logs-viewer'
import { EmailTemplateForm } from '@/components/settings/email-template-form'
import { SmtpAccountsForm } from '@/components/settings/smtp-accounts-form'

export default function EmailSettingsPage() {
  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <SmtpAccountsForm />
      <EmailTemplateForm />
      <EmailLogsViewer />
    </div>
  )
}

