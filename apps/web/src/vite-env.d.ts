/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SERVER_PATH: string
  readonly VITE_APP_SERVER_PATH_TARGET: string
  readonly VITE_COLLAB_WS_URL: string
  readonly VITE_AGENT_BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>

  export default component
}
