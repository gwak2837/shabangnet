import { SMTPAccountCard } from '../email/smtp/smtp-accounts-form'
import { SettingsDetailHeader } from '../settings-detail-header'

export default function EmailSmtpSettingsPage() {
  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <SettingsDetailHeader backHref="/settings#email" backLabel="이메일" />
      <SMTPAccountCard />
    </div>
  )
}
