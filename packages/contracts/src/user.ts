import { z } from 'zod'

export const LANGUAGE_PREFERENCE = {
  AUTO: 'auto',
  ZH_CN: 'zh-CN',
  EN_US: 'en-US',
} as const

export const LANGUAGE_PREFERENCE_VALUES = [
  LANGUAGE_PREFERENCE.AUTO,
  LANGUAGE_PREFERENCE.ZH_CN,
  LANGUAGE_PREFERENCE.EN_US,
] as const

export const APPEARANCE_PREFERENCE = {
  AUTO: 'auto',
  LIGHT: 'light',
  DARK: 'dark',
} as const

export const APPEARANCE_PREFERENCE_VALUES = [
  APPEARANCE_PREFERENCE.AUTO,
  APPEARANCE_PREFERENCE.LIGHT,
  APPEARANCE_PREFERENCE.DARK,
] as const

export const LANGUAGE_PREFERENCE_LABELS = {
  [LANGUAGE_PREFERENCE.AUTO]: '跟随系统',
  [LANGUAGE_PREFERENCE.ZH_CN]: '简体中文',
  [LANGUAGE_PREFERENCE.EN_US]: 'English',
} as const satisfies Record<(typeof LANGUAGE_PREFERENCE_VALUES)[number], string>

export const APPEARANCE_PREFERENCE_LABELS = {
  [APPEARANCE_PREFERENCE.AUTO]: '跟随系统',
  [APPEARANCE_PREFERENCE.LIGHT]: '浅色',
  [APPEARANCE_PREFERENCE.DARK]: '深色',
} as const satisfies Record<(typeof APPEARANCE_PREFERENCE_VALUES)[number], string>

export const ACCOUNT_DELETION_CONFIRMATION_PHRASE = '删除我的账号'

export const LanguagePreferenceSchema = z.enum(LANGUAGE_PREFERENCE_VALUES)
export const AppearancePreferenceSchema = z.enum(APPEARANCE_PREFERENCE_VALUES)

export const AuditUserSummarySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullable(),
}).strict()
