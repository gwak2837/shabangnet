import { SABANGNET_COLUMNS } from '@/common/constants'

export const SABANGNET_COLUMNS_REQUIRED_FIRST = [...SABANGNET_COLUMNS].sort((a, b) => {
  const reqA = a.required ? 1 : 0
  const reqB = b.required ? 1 : 0
  if (reqA !== reqB) return reqB - reqA
  return a.index - b.index
})


