/**
 * 특정 키만 필수로 두고 나머지는 Partial로 만드는 유틸리티 타입
 *
 * @example
 * interface User { id: number; name: string; email: string }
 * type UpdateUser = PartialExcept<User, 'id'>
 * // { id: number } & { name?: string; email?: string }
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>
