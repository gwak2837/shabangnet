'use client'

import { SABANGNET_COLUMNS } from '@/common/constants'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const SABANGNET_FIELD_OPTIONS = SABANGNET_COLUMNS.map((col) => ({
  key: col.key,
  label: col.label,
  required: col.required,
}))

interface MappingRowProps {
  header: string
  onChange: (header: string, value: string) => void
  value: string
}

export function MappingRow({ header, value, onChange }: MappingRowProps) {
  return (
    <div className="flex items-center gap-4 bg-muted/20 px-3 py-2">
      <span className="flex-1 truncate text-sm font-medium text-foreground">{header}</span>
      <Select onValueChange={(v) => onChange(header, v)} value={value}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="선택하세요" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">
            <span className="text-muted-foreground">매핑 안함</span>
          </SelectItem>
          {SABANGNET_FIELD_OPTIONS.map((field) => (
            <SelectItem key={field.key} value={field.key}>
              {field.label}
              {field.required && <span className="ml-1 text-destructive">*</span>}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
