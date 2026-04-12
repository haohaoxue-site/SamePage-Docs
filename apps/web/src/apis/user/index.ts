import type { AuthProviderName } from '@haohaoxue/samepage-domain'
import type {
  ConfirmBindEmailDto,
  CurrentUserDto,
  DeleteCurrentUserDto,
  DeleteCurrentUserResponseDto,
  RequestBindEmailCodeDto,
  RequestBindEmailCodeResponseDto,
  UpdateCurrentUserAvatarResponseDto,
  UpdateCurrentUserProfileDto,
  UpdateUserPreferencesDto,
  UserSettingsDto,
} from './typing'
import { axios } from '@/utils/axios'

export * from './typing'

export function getCurrentUser(): Promise<CurrentUserDto> {
  return axios.request({
    method: 'get',
    url: '/users/me',
  })
}

export function getCurrentUserSettings(): Promise<UserSettingsDto> {
  return axios.request({
    method: 'get',
    url: '/users/me/settings',
  })
}

export function updateCurrentUserProfile(data: UpdateCurrentUserProfileDto): Promise<CurrentUserDto> {
  return axios.request({
    method: 'patch',
    url: '/users/me/profile',
    data,
  })
}

export function updateCurrentUserAvatar(file: File): Promise<UpdateCurrentUserAvatarResponseDto> {
  const formData = new FormData()
  formData.set('file', file)

  return axios.request({
    method: 'put',
    url: '/users/me/avatar',
    data: formData,
  })
}

export function requestBindEmailCode(
  data: RequestBindEmailCodeDto,
): Promise<RequestBindEmailCodeResponseDto> {
  return axios.request({
    method: 'post',
    url: '/users/me/email/request-bind-code',
    data,
  })
}

export function confirmBindEmail(data: ConfirmBindEmailDto): Promise<CurrentUserDto> {
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

export function disconnectOauthBinding(provider: AuthProviderName): Promise<CurrentUserDto> {
  return axios.request({
    method: 'delete',
    url: `/users/me/oauth/${provider}`,
  })
}

export function deleteCurrentUser(data: DeleteCurrentUserDto): Promise<DeleteCurrentUserResponseDto> {
  return axios.request({
    method: 'post',
    url: '/users/me/delete',
    data,
    withCookieAuth: true,
  })
}

export function updateUserPreferences(data: UpdateUserPreferencesDto): Promise<UserSettingsDto['preferences']> {
  return axios.request({
    method: 'patch',
    url: '/users/me/preferences',
    data,
  })
}
