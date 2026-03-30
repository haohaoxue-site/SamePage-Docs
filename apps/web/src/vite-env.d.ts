/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SERVER_PATH: string
  readonly VITE_APP_SERVER_PATH_TARGET: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>

  export default component
}
