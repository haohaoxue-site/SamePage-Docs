import 'axios'

declare module 'axios' {
  interface AxiosRequestConfig {
    withCookieAuth?: boolean
  }

  interface InternalAxiosRequestConfig {
    withCookieAuth?: boolean
    _retry?: boolean
  }
}
