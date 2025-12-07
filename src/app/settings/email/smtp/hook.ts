import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/common/constants/query-keys'

import { getSMTPAccountAction } from './action'

export function useSMTPAccount() {
  return useQuery({
    queryKey: queryKeys.settings.smtp,
    queryFn: getSMTPAccountAction,
  })
}
