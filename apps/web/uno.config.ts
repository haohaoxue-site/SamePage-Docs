import { defineConfig, presetIcons, presetUno } from 'unocss'

export default defineConfig({
  safelist: [
    'i-carbon-home',
    'i-carbon-chat-bot',
    'i-carbon-document-multiple-01',
    'i-carbon-data-base',
    'i-carbon-tree-view',
  ],
  presets: [presetUno(), presetIcons()],
  shortcuts: {
    'app-sidebar-item': 'flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-colors hover:bg-#eff1f3 text-[#646a73] hover:text-[#3370ff] active:bg-#e5e8eb',
    'app-sidebar-item-active': 'bg-[#eff1f3]! text-[#3370ff]! font-medium',
    'app-card': 'bg-white border border-[#eff1f3] rounded-xl shadow-sm',
    'app-input': 'px-3 py-1.5 bg-[#f5f7fa] border border-transparent rounded-md focus:border-[#3370ff] focus:bg-white outline-none transition-all',
    'app-btn': 'inline-flex items-center justify-center px-4 py-1.5 rounded-md font-medium cursor-pointer transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
    'app-btn-primary': 'app-btn bg-[#3370ff] text-white hover:bg-[#2b5eda]',
    'app-btn-ghost': 'app-btn bg-transparent text-[#646a73] hover:bg-[#eff1f3] hover:text-[#3370ff]',
  },
  theme: {
    colors: {
      primary: '#3370ff',
      secondary: '#646a73',
      main: '#1f2329',
      border: '#eff1f3',
      sidebar: '#f9f9f9',
    },
    fontFamily: {
      sans: 'Inter, system-ui, -apple-system, sans-serif',
    },
  },
})
