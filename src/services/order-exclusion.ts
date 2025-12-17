import { sql, type SQL, type SQLWrapper } from 'drizzle-orm'

export function orderExcludedReasonSql(fulfillmentType: SQLWrapper): SQL<string | null> {
  const enabled = exclusionEnabledSql()

  return sql<string | null>`
    case
      when ${enabled} then (
        select coalesce("exclusion_pattern"."description", "exclusion_pattern"."pattern")
        from "exclusion_pattern"
        where "exclusion_pattern"."enabled" = true
          and position("exclusion_pattern"."pattern" in ${fulfillmentType}) > 0
        order by "exclusion_pattern"."created_at"
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
      from "exclusion_pattern"
      where "exclusion_pattern"."enabled" = true
        and position("exclusion_pattern"."pattern" in ${fulfillmentType}) > 0
    )
  `
}

export function orderIsIncludedSql(fulfillmentType: SQLWrapper): SQL<boolean> {
  return sql<boolean>`not (${orderIsExcludedSql(fulfillmentType)})`
}

function exclusionEnabledSql(): SQL<boolean> {
  return sql<boolean>`
    coalesce(
      (
        select case
          when "settings"."value" in ('true', 'false') then "settings"."value"::boolean
          else true
        end
        from "settings"
        where "settings"."key" = 'exclusion_enabled'
      ),
      true
    )
  `
}
