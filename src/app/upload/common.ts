import { UploadResultData } from './upload-result'

export type UploadState =
  | { status: 'error'; message: string; file?: undefined; result?: undefined }
  | { status: 'idle'; message?: undefined; file?: undefined; result?: undefined }
  | { status: 'processing'; message?: undefined; file: File; result?: undefined }
  | { status: 'success'; message?: undefined; file: File; result: UploadResultData }
