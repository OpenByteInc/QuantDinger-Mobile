import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { pinia, useSettingsStore } from './stores'

// Vant 样式
import 'vant/lib/index.css'

// 全局样式
import './styles/index.css'

// Capacitor 插件
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'

const app = createApp(App)

app.use(pinia)
app.use(router)

const settingsStore = useSettingsStore()
document.documentElement.setAttribute('data-theme', settingsStore.theme)

// 初始化 Capacitor
const initCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    // 设置状态栏样式
    try {
      await StatusBar.setStyle({ style: Style.Light })
      await StatusBar.setBackgroundColor({ color: '#000000' })
    } catch (e) {
      console.warn('StatusBar not available:', e)
    }
    
    // 隐藏启动画面
    try {
      await SplashScreen.hide()
    } catch (e) {
      console.warn('SplashScreen not available:', e)
    }
    
    // 监听返回按钮（Android）
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        router.back()
      } else {
        CapApp.exitApp()
      }
    })
  }
}

// 挂载应用
app.mount('#app')

// 初始化原生功能
initCapacitor()

// 全局错误处理
app.config.errorHandler = (err, vm, info) => {
  console.error('Global error:', err, info)
}
