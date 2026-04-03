export interface RequestResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}
