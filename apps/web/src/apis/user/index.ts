import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type {
  ConfirmBindEmailRequest,
  CurrentUser,
  DeleteCurrentUserRequest,
  DeleteCurrentUserResponse,
  RequestBindEmailCodeRequest,
  RequestBindEmailCodeResponse,
  UpdateCurrentUserAvatarResponse,
  UpdateCurrentUserProfileRequest,
  UpdateUserPreferencesRequest,
  UserSettings,
} from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getCurrentUser(): Promise<CurrentUser> {
  return axios.request({
    method: 'get',
    url: '/users/me',
  })
}

export function getCurrentUserSettings(): Promise<UserSettings> {
  return axios.request({
    method: 'get',
    url: '/users/me/settings',
  })
}

export function updateCurrentUserProfile(data: UpdateCurrentUserProfileRequest): Promise<CurrentUser> {
  return axios.request({
    method: 'patch',
    url: '/users/me/profile',
    data,
  })
}

export function updateCurrentUserAvatar(file: File): Promise<UpdateCurrentUserAvatarResponse> {
  const formData = new FormData()
  formData.set('file', file)

  return axios.request({
    method: 'put',
    url: '/users/me/avatar',
    data: formData,
  })
}

export function requestBindEmailCode(
  data: RequestBindEmailCodeRequest,
): Promise<RequestBindEmailCodeResponse> {
  return axios.request({
    method: 'post',
    url: '/users/me/email/request-bind-code',
    data,
  })
}

export function confirmBindEmail(data: ConfirmBindEmailRequest): Promise<CurrentUser> {
  return axios.request({
    method: 'post',
    url: '/users/me/email/confirm-bind',
    data,
  })
}

export function startOauthBinding(provider: AuthProviderName): Promise<{ authorizeUrl: string }> {
  return axios.request({
    method: 'post',
    url: `/users/me/oauth/${provider}/start-bind`,
  })
}

export function disconnectOauthBinding(provider: AuthProviderName): Promise<CurrentUser> {
  return axios.request({
    method: 'delete',
    url: `/users/me/oauth/${provider}`,
  })
}

export function deleteCurrentUser(data: DeleteCurrentUserRequest): Promise<DeleteCurrentUserResponse> {
  return axios.request({
    method: 'post',
    url: '/users/me/delete',
    data,
    withCookieAuth: true,
  })
}

export function updateUserPreferences(data: UpdateUserPreferencesRequest): Promise<UserSettings['preferences']> {
  return axios.request({
    method: 'patch',
    url: '/users/me/preferences',
    data,
  })
}
