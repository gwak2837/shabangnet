import { SettingsDetailHeader } from '../settings-detail-header'
import { ExclusionForm } from './exclusion-form'

export default function ExclusionSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsDetailHeader />
      <ExclusionForm />
    </div>
  )
}


