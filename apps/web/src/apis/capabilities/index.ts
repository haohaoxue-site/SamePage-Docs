import type { AuthCapabilitiesDto } from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getAuthCapabilities(): Promise<AuthCapabilitiesDto> {
  return axios.request({
    method: 'get',
    url: '/capabilities/auth',
  })
}
