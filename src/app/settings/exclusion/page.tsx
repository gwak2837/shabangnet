import { ExclusionForm } from '../order/exclusion/exclusion-form'
import { SettingsDetailHeader } from '../settings-detail-header'

export default function ExclusionSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsDetailHeader backHref="/settings#validation" backLabel="검증" />
      <ExclusionForm />
    </div>
  )
}


