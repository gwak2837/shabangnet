import { SettingsDetailHeader } from '../settings-detail-header'
import { CourierForm } from './courier-form'

export default function CourierSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsDetailHeader />
      <CourierForm />
    </div>
  )
}


