import type { RequestResponse } from '@haohaoxue/samepage-domain'
import type { TokenExchangeResponseDto } from '@/apis/auth/typing'
import rawAxios, { AxiosHeaders } from 'axios'
import { useAuthStore } from '@/stores/auth'

const http = rawAxios.create({
  baseURL: import.meta.env.VITE_APP_SERVER_PATH,
  timeout: 6000 * 60,
})

let refreshPromise: Promise<TokenExchangeResponseDto | null> | null = null

http.interceptors.request.use((config) => {
  if (config.withCookieAuth) {
    config.withCredentials = true
    return config
  }

  const authStore = useAuthStore()

  if (!authStore.accessToken) {
    return config
  }

  const headers = AxiosHeaders.from(config.headers)
  headers.set('Authorization', `Bearer ${authStore.accessToken}`)
  config.headers = headers

  return config
})

http.interceptors.response.use(
  (response) => {
    const data = response.data as RequestResponse
    if (!data || (data.code !== 200 && data.code !== 201)) {
      return Promise.reject(new Error(data?.message || '请求失败'))
    }
    return data.data as any
  },
  async (error) => {
    const data = error.response?.data
    const status = error.response?.status
    const originalRequest = error.config

    if (
      status === 401
      && originalRequest
      && !originalRequest._retry
      && !originalRequest.withCookieAuth
      && useAuthStore().accessToken
    ) {
      originalRequest._retry = true

      const refreshedSession = await refreshAccessTokenOnce()

      if (refreshedSession?.accessToken) {
        const headers = AxiosHeaders.from(originalRequest.headers)
        headers.set('Authorization', `Bearer ${refreshedSession.accessToken}`)
        originalRequest.headers = headers
        return http.request(originalRequest)
      }
    }

    if (status === 401) {
      useAuthStore().clearSession()
    }

    const message = data?.message ?? error.message
    const requestError = new Error(message || '请求失败') as Error & { status?: number }
    requestError.status = status
    return Promise.reject(requestError)
  },
)

export { http as axios }

async function refreshAccessTokenOnce() {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = rawAxios
    .create({
      baseURL: import.meta.env.VITE_APP_SERVER_PATH,
      timeout: 6000 * 60,
      withCredentials: true,
    })
    .request<RequestResponse<TokenExchangeResponseDto>>({
      method: 'post',
      url: '/auth/refresh',
    })
    .then((response) => {
      const responseData = response.data

      if (
        !responseData
        || (responseData.code !== 200 && responseData.code !== 201)
        || !responseData.data?.accessToken
        || !responseData.data.user
      ) {
        useAuthStore().clearSession()
        return null
      }

      const authStore = useAuthStore()
      authStore.accessToken = responseData.data.accessToken
      authStore.user = responseData.data.user
      return responseData.data
    })
    .catch(() => {
      useAuthStore().clearSession()
      return null
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}
