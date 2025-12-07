import { EmailTemplateForm } from '@/components/settings/email-template-form'
import { SmtpAccountCard } from '@/components/settings/smtp-accounts-form'

export default function EmailSettingsPage() {
  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <SmtpAccountCard purpose="system" />
      <SmtpAccountCard purpose="order" />
      <EmailTemplateForm />
    </div>
  )
}
