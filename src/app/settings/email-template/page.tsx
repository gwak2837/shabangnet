import { EmailTemplateForm } from '../email/template/email-template-form'
import { SettingsDetailHeader } from '../settings-detail-header'

export default function EmailTemplateSettingsPage() {
  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <SettingsDetailHeader backHref="/settings#templates" backLabel="템플릿" />
      <EmailTemplateForm />
    </div>
  )
}
