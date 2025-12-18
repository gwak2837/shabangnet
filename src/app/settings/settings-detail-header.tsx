import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface SettingsDetailHeaderProps {
  backHref: string
  backLabel: string
  description?: string
  title?: string
}

export function SettingsDetailHeader({ backHref, backLabel, title, description }: SettingsDetailHeaderProps) {
  return (
    <div className="space-y-2">
      <Link className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" href={backHref}>
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        {backLabel}
      </Link>
      {title ? (
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}
    </div>
  )
}


