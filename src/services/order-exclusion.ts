import { sql, type SQL, type SQLWrapper } from 'drizzle-orm'

import { exclusionPattern, settings } from '@/db/schema/settings'

export function orderExcludedReasonSql(fulfillmentType: SQLWrapper): SQL<string | null> {
  const enabled = exclusionEnabledSql()

  // "Reason" follows the existing behavior:
  // - first matched pattern (createdAt asc)
  // - description preferred, fallback to pattern
  return sql<string | null>`
    case
      when ${enabled} then (
        select coalesce(${exclusionPattern.description}, ${exclusionPattern.pattern})
        from ${exclusionPattern}
        where ${exclusionPattern.enabled} = true
          and position(${exclusionPattern.pattern} in ${fulfillmentType}) > 0
        order by ${exclusionPattern.createdAt}
        limit 1
      )
      else null
    end
  `
}

export function orderIsExcludedSql(fulfillmentType: SQLWrapper): SQL<boolean> {
  const enabled = exclusionEnabledSql()
  return sql<boolean>`
    ${enabled}
    and exists (
      select 1
      from ${exclusionPattern}
      where ${exclusionPattern.enabled} = true
        and position(${exclusionPattern.pattern} in ${fulfillmentType}) > 0
    )
  `
}

export function orderIsIncludedSql(fulfillmentType: SQLWrapper): SQL<boolean> {
  return sql<boolean>`not (${orderIsExcludedSql(fulfillmentType)})`
}

function exclusionEnabledSql(): SQL<boolean> {
  // settings.value is stored as JSON.stringify(boolean) => 'true' | 'false'
  // If missing/invalid, default to true.
  return sql<boolean>`
    coalesce(
      (
        select case
          when ${settings.value} in ('true', 'false') then ${settings.value}::boolean
          else true
        end
        from ${settings}
        where ${settings.key} = 'exclusion_enabled'
      ),
      true
    )
  `
}
