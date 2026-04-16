import type {
  AppearancePreference,
  AuthProviderName,
  LanguagePreference,
} from '@haohaoxue/samepage-domain'
import { Buffer } from 'node:buffer'
import { createHash, randomInt } from 'node:crypto'
import { SERVER_PATH } from '@haohaoxue/samepage-contracts'
import { BadRequestException } from '@nestjs/common'
import {
  AuthProvider,
  UserAppearancePreference as DbUserAppearancePreference,
  UserLanguagePreference as DbUserLanguagePreference,
} from '@prisma/client'
import { normalizeEmail } from '../../utils/email'

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024
const AVATAR_MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
} as const

export type AvatarMimeType = keyof typeof AVATAR_MIME_EXTENSION_MAP

export function buildAvatarStorageKey(userId: string, mimeType: AvatarMimeType): string {
  const timestamp = Date.now()

  return `user-avatar/${userId}/${timestamp}-${createHash('sha1')
    .update(`${userId}:${timestamp}:${randomInt(0, Number.MAX_SAFE_INTEGER)}`)
    .digest('hex')}.${AVATAR_MIME_EXTENSION_MAP[mimeType]}`
}

export function assertAvatarMimeType(mimeType: string): AvatarMimeType {
  const normalizedMimeType = mimeType.trim().toLowerCase()

  if (normalizedMimeType in AVATAR_MIME_EXTENSION_MAP) {
    return normalizedMimeType as AvatarMimeType
  }

  throw new BadRequestException('头像仅支持 JPG、PNG、WEBP 格式')
}

export function assertAvatarBuffer(buffer: Buffer, mimeType: AvatarMimeType): void {
  if (!buffer.length) {
    throw new BadRequestException('头像文件不能为空')
  }

  if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
    throw new BadRequestException('头像大小不能超过 2MB')
  }

  if (!isAvatarSignatureMatched(buffer, mimeType)) {
    throw new BadRequestException('头像文件格式不正确')
  }
}

export function normalizeAccountDeletionConfirmation(value: string, isEmail: boolean): string {
  return isEmail ? normalizeEmail(value) : value.trim()
}

export function buildAvatarUrl(userId: string): string {
  return `${SERVER_PATH}/users/avatar/${userId}?v=${Date.now()}`
}

export function mapLanguagePreference(value: DbUserLanguagePreference | null | undefined): LanguagePreference {
  if (value === 'ZH_CN') {
    return 'zh-CN'
  }

  if (value === 'EN_US') {
    return 'en-US'
  }

  return 'auto'
}

export function mapAppearancePreference(value: DbUserAppearancePreference | null | undefined): AppearancePreference {
  if (value === 'LIGHT') {
    return 'light'
  }

  if (value === 'DARK') {
    return 'dark'
  }

  return 'auto'
}

export function mapLanguagePreferenceToDb(value: LanguagePreference): DbUserLanguagePreference {
  if (value === 'zh-CN') {
    return 'ZH_CN'
  }

  if (value === 'en-US') {
    return 'EN_US'
  }

  return 'AUTO'
}

export function mapAppearancePreferenceToDb(value: AppearancePreference): DbUserAppearancePreference {
  if (value === 'light') {
    return 'LIGHT'
  }

  if (value === 'dark') {
    return 'DARK'
  }

  return 'AUTO'
}

export function resolveDbProvider(provider: AuthProviderName): AuthProvider {
  if (provider === 'github') {
    return AuthProvider.GITHUB
  }

  return AuthProvider.LINUX_DO
}

function isAvatarSignatureMatched(buffer: Buffer, mimeType: AvatarMimeType): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF
  }

  if (mimeType === 'image/png') {
    return buffer.length >= 8
      && buffer[0] === 0x89
      && buffer[1] === 0x50
      && buffer[2] === 0x4E
      && buffer[3] === 0x47
      && buffer[4] === 0x0D
      && buffer[5] === 0x0A
      && buffer[6] === 0x1A
      && buffer[7] === 0x0A
  }

  return buffer.length >= 12
    && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
    && buffer.subarray(8, 12).toString('ascii') === 'WEBP'
}
