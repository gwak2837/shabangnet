import { z } from 'zod'

import type { UploadError, UploadSummary } from '../type'

export const exportConfigSchema = z.object({
  copyPrefixRows: z.boolean().optional(),
  columns: z
    .array(
      z.object({
        header: z.string().optional(),
        source: z.discriminatedUnion('type', [
          z.object({ type: z.literal('input'), columnIndex: z.number().int().min(1) }),
          z.object({ type: z.literal('const'), value: z.string() }),
        ]),
      }),
    )
    .min(1),
})

export type ExportConfig = z.infer<typeof exportConfigSchema>

export interface ShoppingMallUploadMetaV1 {
  autoCreatedManufacturers: string[]
  errorSamples: UploadError[]
  kind: 'shopping_mall_upload_meta'
  mallName: string
  summary: UploadSummary
  v: 1
}

export const ERROR_SAMPLE_LIMIT = 50
