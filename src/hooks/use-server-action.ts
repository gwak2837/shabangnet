'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useActionState, useCallback, useTransition } from 'react'

interface UseFormActionOptions<TState> {
  invalidateKeys?: readonly (readonly unknown[])[] // 무효화할 queryKey 배열들
  onError?: (error: string) => void
  onSuccess?: (result: TState) => void
}

interface UseServerActionOptions<TResult> {
  invalidateKeys?: readonly (readonly unknown[])[] // 무효화할 queryKey 배열들
  onError?: (error: string) => void
  onSuccess?: (result: TResult) => void
}

/**
 * 폼 제출용 Server Action 래퍼 훅 (useActionState 기반)
 *
 * @example
 * const [state, formAction, isPending] = useFormAction(createAction, initialState, {
 *   invalidateKeys: [queryKeys.items.all],
 * })
 *
 * <form action={formAction}>...</form>
 */
export function useFormAction<TState, TPayload>(
  action: (prevState: Awaited<TState>, payload: TPayload) => Promise<TState> | TState,
  initialState: Awaited<TState>,
  options?: UseFormActionOptions<Awaited<TState>>,
) {
  const queryClient = useQueryClient()

  const wrappedAction = async (prevState: Awaited<TState>, payload: TPayload): Promise<Awaited<TState>> => {
    const result = await action(prevState, payload)

    // 캐시 무효화
    if (options?.invalidateKeys) {
      for (const key of options.invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: [...key] })
      }
    }

    // 콜백 처리
    if (result && typeof result === 'object' && 'error' in result) {
      options?.onError?.(result.error as string)
    } else {
      options?.onSuccess?.(result as Awaited<TState>)
    }

    return result as Awaited<TState>
  }

  return useActionState(wrappedAction, initialState)
}

/**
 * 버튼 클릭용 Server Action 래퍼 훅 (useTransition 기반)
 *
 * @example
 * const { execute: deleteItem, isPending } = useServerAction(deleteAction, {
 *   invalidateKeys: [queryKeys.items.all],
 *   onSuccess: () => toast.success('삭제되었습니다'),
 * })
 *
 * <button onClick={() => deleteItem(id)} disabled={isPending}>삭제</button>
 */
export function useServerAction<TInput, TResult>(
  action: (input: TInput) => Promise<TResult>,
  options?: UseServerActionOptions<TResult>,
) {
  const [isPending, startTransition] = useTransition()
  const queryClient = useQueryClient()

  const execute = useCallback(
    (input: TInput) => {
      startTransition(async () => {
        const result = await action(input)

        // 캐시 무효화
        if (options?.invalidateKeys) {
          for (const key of options.invalidateKeys) {
            queryClient.invalidateQueries({ queryKey: [...key] })
          }
        }

        // 콜백 처리
        if (result && typeof result === 'object' && 'error' in result) {
          options?.onError?.(result.error as string)
        } else {
          options?.onSuccess?.(result)
        }
      })
    },
    [action, options, queryClient],
  )

  return { execute, isPending }
}
