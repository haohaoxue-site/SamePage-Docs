export interface RequestResponse<T = unknown> {
  /**
   * 响应码
   * @description HTTP 状态码。
   */
  code: number
  /**
   * 响应消息
   * @description 面向调用方的响应描述。
   */
  message: string
  /**
   * 数据
   * @description 成功时返回业务数据，失败时为 null。
   */
  data: T | null
}
