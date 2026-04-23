export type IsoDateTimeString = string

export interface RequestResponse<T = unknown> {
  code: number
  message: string
  data: T | null
}
