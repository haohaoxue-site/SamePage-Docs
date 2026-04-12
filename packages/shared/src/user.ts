import type { AppearancePreference, LanguagePreference, ResolvedAppearancePreference } from '@haohaoxue/samepage-domain'
import { APPEARANCE_PREFERENCE, APPEARANCE_PREFERENCE_LABELS, LANGUAGE_PREFERENCE_LABELS } from '@haohaoxue/samepage-contracts'

export function formatLanguagePreference(value: LanguagePreference): string {
  return LANGUAGE_PREFERENCE_LABELS[value]
}

export function formatAppearancePreference(value: AppearancePreference): string {
  return APPEARANCE_PREFERENCE_LABELS[value]
}

export function resolveAppearancePreference(
  value: AppearancePreference,
  systemValue: ResolvedAppearancePreference,
): ResolvedAppearancePreference {
  return value === APPEARANCE_PREFERENCE.AUTO ? systemValue : value
}
