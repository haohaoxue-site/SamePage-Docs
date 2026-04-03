import { useColorMode } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed } from 'vue'

export type AppearanceMode = 'auto' | 'light' | 'dark'
export type ResolvedAppearanceMode = Exclude<AppearanceMode, 'auto'>

export const APPEARANCE_STORAGE_KEY = 'samepage_appearance'

export const useAppearanceStore = defineStore('appearance', () => {
  const colorMode = useColorMode({
    initialValue: 'auto',
    storageKey: APPEARANCE_STORAGE_KEY,
    modes: {
      light: '',
      dark: 'dark',
    },
  })

  const preference = computed<AppearanceMode>({
    get: () => colorMode.store.value as AppearanceMode,
    set: (value) => {
      colorMode.store.value = value
    },
  })

  const resolvedMode = computed<ResolvedAppearanceMode>(() => colorMode.state.value === 'dark' ? 'dark' : 'light')
  const systemMode = computed<ResolvedAppearanceMode>(() => colorMode.system.value === 'dark' ? 'dark' : 'light')
  const isDark = computed(() => resolvedMode.value === 'dark')

  function setPreference(value: AppearanceMode) {
    preference.value = value
  }

  return {
    preference,
    resolvedMode,
    systemMode,
    isDark,
    setPreference,
  }
})
