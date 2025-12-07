import { SMTPAccountCard } from '@/app/settings/email/smtp/smtp-accounts-form'
import { EmailTemplateForm } from '@/app/settings/email/template/email-template-form'

export default function EmailSettingsPage() {
  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <SMTPAccountCard />
      <EmailTemplateForm />
    </div>
  )
}
