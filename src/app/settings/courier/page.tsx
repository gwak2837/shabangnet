import { CourierForm } from '../order/courier/courier-form'
import { SettingsDetailHeader } from '../settings-detail-header'

export default function CourierSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsDetailHeader backHref="/settings#shipping" backLabel="배송" />
      <CourierForm />
    </div>
  )
}


