import { CommonOrderTemplateForm } from './common-order-template-form'
import { CourierForm } from './courier/courier-form'
import { DuplicateCheckForm } from './duplicate-check-form'
import { ExclusionForm } from './exclusion/exclusion-form'
import { ShoppingMallTemplate } from './shopping-mall-template/shopping-mall-template'

export default function OrdersSettingsPage() {
  return (
    <div className="max-w-3xl flex flex-col gap-6">
      <ShoppingMallTemplate />
      <ExclusionForm />
      <DuplicateCheckForm />
      <CourierForm />
      <CommonOrderTemplateForm />
    </div>
  )
}
