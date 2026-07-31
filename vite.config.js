import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { VantResolver } from '@vant/auto-import-resolver'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgVersion = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')).version
const appVersion = process.env.APP_VERSION || process.env.GIT_TAG || pkgVersion

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  const apiTarget =
    process.env.VITE_DEV_API_TARGET ||
    process.env.BACKEND_URL ||
    env.VITE_DEV_API_TARGET ||
    env.BACKEND_URL ||
    'http://127.0.0.1:5000'

  return {
    define: {
      __APP_VERSION__: JSON.stringify(appVersion)
    },
    plugins: [
      vue(),
      AutoImport({
        resolvers: [VantResolver()],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: true
      }),
      Components({
        resolvers: [VantResolver()]
      })
    ],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue', 'vue-router', 'pinia', 'vue-i18n'],
            'vant-vendor': ['vant'],
            'capacitor-vendor': [
              '@capacitor/core',
              '@capacitor/app',
              '@capacitor/browser',
              '@capacitor/haptics',
              '@capacitor/keyboard',
              '@capacitor/preferences',
              '@capacitor/push-notifications',
              '@capacitor/splash-screen',
              '@capacitor/status-bar'
            ]
          }
        }
      }
    }
  }
})
