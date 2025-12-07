import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'
import { getCourierMappings } from '@/services/settings'

export function useCourierMappings() {
  return useQuery({
    queryKey: queryKeys.settings.courier,
    queryFn: getCourierMappings,
  })
}
