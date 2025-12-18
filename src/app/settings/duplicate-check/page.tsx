import { DuplicateCheckForm } from '../order/duplicate-check-form'
import { SettingsDetailHeader } from '../settings-detail-header'

export default function DuplicateCheckSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsDetailHeader backHref="/settings#validation" backLabel="검증" />
      <DuplicateCheckForm />
    </div>
  )
}


