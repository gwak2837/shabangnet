import { CourierForm } from './courier/courier-form'
import { DuplicateCheckForm } from './duplicate-check-form'
import { ExclusionForm } from './exclusion/exclusion-form'
import { ShoppingMallTemplate } from './shopping-mall-template/shopping-mall-template'
import { SynonymForm } from './synonym-form'

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
