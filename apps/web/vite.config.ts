import process from 'node:process'
import { fileURLToPath, URL } from 'node:url'
import vue from '@vitejs/plugin-vue'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import Components from 'unplugin-vue-components/vite'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const elementPlusResolver = ElementPlusResolver({
  importStyle: false,
})

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      vue(),
      UnoCSS(),
      AutoImport({
        dts: './auto-imports.d.ts',
        resolvers: [elementPlusResolver],
        vueTemplate: true,
      }),
      Components({
        dts: './components.d.ts',
        resolvers: [elementPlusResolver],
      }),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        [env.VITE_APP_SERVER_PATH]: {
          target: env.VITE_APP_SERVER_PATH_TARGET,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './__tests__/setup.ts',
      include: ['./__tests__/**/*.spec.ts'],
    },
  }
})
