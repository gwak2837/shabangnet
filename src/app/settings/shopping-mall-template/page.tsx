import { ShoppingMallTemplate } from '../order/shopping-mall-template/shopping-mall-template'
import { SettingsDetailHeader } from '../settings-detail-header'

export default function ShoppingMallTemplateSettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsDetailHeader backHref="/settings#templates" backLabel="템플릿" />
      <ShoppingMallTemplate />
    </div>
  )
}
