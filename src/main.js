import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia, useSettingsStore } from './stores'
import i18n from './locales'

import 'vant/lib/index.css'
import './styles/index.css'

import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { parseOAuthReturnUrl } from '@/utils/oauthRedirect'

const app = createApp(App)

app.use(pinia)
app.use(i18n)
app.use(router)

const settingsStore = useSettingsStore()

const applyThemeAttr = (theme) => {
  document.documentElement.setAttribute('data-theme', theme || 'dark')
}

const getNativeThemeChrome = (theme) => (
  theme === 'light'
    ? { statusBarStyle: Style.Dark, backgroundColor: '#ffffff' }
    : { statusBarStyle: Style.Light, backgroundColor: '#000000' }
)

const syncStatusBar = async (theme) => {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { statusBarStyle, backgroundColor } = getNativeThemeChrome(theme)
    await StatusBar.setOverlaysWebView({ overlay: false })
    await StatusBar.setStyle({ style: statusBarStyle })
    await StatusBar.setBackgroundColor({ color: backgroundColor })
  } catch (e) {
    console.warn('StatusBar not available:', e)
  }
}

applyThemeAttr(settingsStore.theme)

settingsStore.$subscribe((_mutation, state) => {
  applyThemeAttr(state.theme)
  syncStatusBar(state.theme)
})

const consumeOAuthDeepLink = async (rawUrl) => {
  const parsed = parseOAuthReturnUrl(rawUrl)
  if (!parsed) return false
  try {
    await Browser.close()
  } catch (_) {
    /* already closed or not opened */
  }
  const q = {}
  if (parsed.oauth_token) q.oauth_token = parsed.oauth_token
  if (parsed.oauth_error) q.oauth_error = parsed.oauth_error
  router.replace({ path: '/login', query: q })
  return true
}

const initCapacitor = async () => {
  if (!Capacitor.isNativePlatform()) return

  await syncStatusBar(settingsStore.theme)

  try {
    await SplashScreen.hide()
  } catch (e) {
    console.warn('SplashScreen not available:', e)
  }

  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      router.back()
    } else {
      CapApp.exitApp()
    }
  })

  CapApp.addListener('appUrlOpen', ({ url }) => {
    if (url) consumeOAuthDeepLink(url)
  })

  try {
    const launch = await CapApp.getLaunchUrl()
    if (launch?.url) await consumeOAuthDeepLink(launch.url)
  } catch (_) {
    /* no cold-start deep link */
  }
}

app.mount('#app')

router.isReady().then(() => {
  initCapacitor()
})

app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err, info)
}
