import { CourierForm } from '@/app/settings/order/courier-form'
import { DuplicateCheckForm } from '@/app/settings/order/duplicate-check-form'
import { ExclusionForm } from '@/app/settings/order/exclusion-form'
import { ShoppingMallTemplate } from '@/app/settings/order/shopping-mall-template'
import { SynonymForm } from '@/app/settings/order/synonym-form'

export default function OrdersSettingsPage() {
  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <CourierForm />
      <ShoppingMallTemplate />
      <SynonymForm />
      <DuplicateCheckForm />
      <ExclusionForm />
    </div>
  )
}
