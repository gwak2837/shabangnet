import { DuplicateCheckForm } from '../duplicate-check-form'
import { SettingsDetailHeader } from '../settings-detail-header'

export default function DuplicateCheckSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsDetailHeader />
      <DuplicateCheckForm />
    </div>
  )
}
