import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('web and Docker API defaults stay deployable while native builds keep an official fallback', () => {
  const config = read('src/config/index.js')
  const vite = read('vite.config.js')
  const nginx = read('deploy/nginx-mobile.conf')
  const dockerfile = read('Dockerfile')

  assert.match(config, /isNativeRuntime \? OFFICIAL_SERVER_URL : webOrigin/)
  assert.match(config, /VITE_DEFAULT_SERVER_URL/)
  assert.match(config, /VITE_PUBLIC_WEB_BASE_URL[\s\S]*webOrigin/)
  assert.match(vite, /loadEnv\(mode, __dirname, ''\)/)
  assert.match(vite, /VITE_DEV_API_TARGET/)
  assert.match(vite, /'http:\/\/127\.0\.0\.1:5000'/)
  assert.match(nginx, /proxy_pass \$backend_upstream/)
  assert.match(dockerfile, /BACKEND_URL=http:\/\/backend:5000/)
  assert.equal(existsSync(new URL('../../.env.production', import.meta.url)), false)
})

test('legacy home and quick-trade pages are retired behind safe redirects', () => {
  const router = read('src/router/index.js')
  const app = read('src/App.vue')
  const main = read('src/main.js')

  assert.match(router, /path: '\/home',\s+redirect: '\/ai'/)
  assert.match(router, /path: '\/quick-trade',\s+redirect: '\/trading'/)
  assert.doesNotMatch(router, /views\/(?:home|quick-trade)/)
  assert.doesNotMatch(router, /showTabbar/)
  assert.doesNotMatch(app, /QuickTrade|name: 'Home'|path: '\/quick-trade'/)
  assert.doesNotMatch(main, /'\/quick-trade'|'\/home'/)
  assert.equal(existsSync(new URL('../../src/views/home/index.vue', import.meta.url)), false)
  assert.equal(existsSync(new URL('../../src/views/quick-trade/index.vue', import.meta.url)), false)
})

test('mobile source exposes usage and monitoring APIs, not code generation or quick trading', () => {
  const api = read('src/api/index.js')
  const stores = read('src/stores/index.js')
  const createStrategy = read('src/views/trading/CreateStrategy.vue')
  const analysis = read('src/views/ai-analysis/index.vue')

  assert.doesNotMatch(api, /quickTradeApi|dashboardApi|\/api\/quick-trade/)
  assert.doesNotMatch(api, /\/api\/strategies\/generate|script-sources\/create/)
  assert.doesNotMatch(stores, /useQuickTradeStore/)
  assert.doesNotMatch(createStrategy, /strategyApi\.generate|scriptSourceApi\.create|generateSourceFromPrompt/)
  assert.doesNotMatch(createStrategy, /<textarea|contenteditable|monaco|codemirror/i)
  assert.match(analysis, /chooseStrategy\(\)/)
  assert.doesNotMatch(analysis, /generateStrategyFromResult|query: \{ prompt/)
})

test('AI action boundary blocks desktop-only workflows without blocking strategy usage', () => {
  const aiHub = read('src/views/ai-hub/index.vue')

  assert.match(aiHub, /unsupported_mobile_workflows: \['code_editing', 'backtest'\]/)
  assert.match(aiHub, /isUnsupportedMobileAction\(action\)/)
  assert.match(aiHub, /generate\[-_\]\?\(code\|strategy\)/)
  assert.doesNotMatch(aiHub, /\/backtest\|indicator\|script\|code\//)
  assert.match(aiHub, /name: 'StrategyDetail'/)
  assert.match(aiHub, /name: 'MarketIndicatorDetail'/)
})

test('live account and stop controls preserve explicit safety boundaries', () => {
  const api = read('src/api/index.js')
  const credentialForm = read('src/views/profile/CredentialForm.vue')
  const credentialList = read('src/views/profile/Credentials.vue')
  const strategyDetail = read('src/views/trading/StrategyDetail.vue')
  const strategyList = read('src/views/trading/index.vue')

  assert.match(api, /test: \(data\) => http\.post\('\/api\/credentials\/test'/)
  assert.match(api, /updateName: \(id, name\) => http\.put\('\/api\/credentials\/update-name'/)
  assert.match(api, /close_positions: Boolean\(closePositions\)/)
  assert.match(credentialForm, /testConnection\(\)/)
  assert.match(credentialForm, /credentialsApi\.test\(this\.credentialPayload\(\)\)/)
  assert.match(credentialList, /credentialsApi\.updateName\(id, name\)/)
  assert.doesNotMatch(credentialList, /credentialsApi\.get\(/)
  assert.match(strategyDetail, /confirmStop\(Boolean\(action\?\.closePositions\)\)/)
  assert.match(strategyList, /confirmStopStrategy\(strategy, Boolean\(action\?\.closePositions\)\)/)
  assert.match(strategyList, /const liveList = list\.filter\(\(strategy\) => this\.isLiveStrategy\(strategy\)\)/)
  assert.match(strategyList, /if \(!this\.isLiveStrategy\(strategy\)\) return '--'/)
})

test('mobile navigation and visible Chinese copy describe strategy use, not coding or backtesting', () => {
  const app = read('src/App.vue')
  const styles = read('src/styles/index.css')
  const locale = read('src/locales/zh-CN.js')

  assert.match(app, /sidebar\.open_navigation/)
  assert.doesNotMatch(styles, /van-tabbar|tabbar-height/)
  assert.match(locale, /choose_strategy: '选择已有策略'/)
  assert.match(locale, /sync_code: '更新版本'/)
  assert.match(locale, /title: '策略配置'/)
  assert.doesNotMatch(locale, /go_backtest|generate_strategy/)
})

test('indicator usage is a read-only signal chart and never exposes tasks, orders, or backtests', () => {
  const api = read('src/api/index.js')
  const router = read('src/router/index.js')
  const chart = read('src/views/indicator/Chart.vue')

  assert.match(router, /path: '\/indicators\/chart'/)
  assert.match(router, /path: '\/indicators\/monitor',\s+redirect: '\/indicators\/chart'/)
  assert.match(api, /previewChart:[\s\S]*\/api\/indicator\/chart-preview/)
  assert.doesNotMatch(api, /getSignalAlerts|createSignalAlert|\/api\/indicator\/signal-alerts/)
  assert.match(chart, /chartData\?\.signals/)
  assert.match(chart, /indicator_chart\.read_only_hint/)
  assert.doesNotMatch(chart, /strategyApi|orderApi|backtestApi|quickTradeApi/)
  assert.doesNotMatch(chart, /<textarea|contenteditable|monaco|codemirror/i)
})

test('navigation removes universe, monitoring, and standalone choose-strategy entries', () => {
  const api = read('src/api/index.js')
  const router = read('src/router/index.js')
  const stores = read('src/stores/index.js')
  const app = read('src/App.vue')
  const aiHub = read('src/views/ai-hub/index.vue')

  assert.match(router, /path: '\/universes',\s+redirect: '\/ai'/)
  assert.doesNotMatch(api, /universeApi|\/api\/universes/)
  assert.doesNotMatch(stores, /useUniverseStore|selected_universe/)
  assert.doesNotMatch(aiHub, /universe_id|universe_code|useUniverseStore/)
  assert.doesNotMatch(app, /name: 'create-bot'|name: 'indicator-monitor'|name: 'universes'/)
  assert.match(app, /name: 'indicator-market'[\s\S]*name: 'trading'/)
  assert.match(app, /name: 'indicator-chart'/)
})

test('profile supports user-facing fields without exposing developer administration', () => {
  const api = read('src/api/index.js')
  const app = read('src/App.vue')
  const profile = read('src/views/profile/index.vue')
  const marketDetail = read('src/views/market/Detail.vue')
  const purchases = read('src/views/market/MyPurchases.vue')

  assert.match(api, /updateProfile: \(data\) => http\.put\('\/api\/users\/profile\/update'/)
  assert.match(profile, /userApi\.updateProfile\(/)
  assert.match(profile, /nickname/)
  assert.match(profile, /avatar/)
  assert.match(profile, /timezone/)
  assert.doesNotMatch(app, /agent[-_ ]?token|skill[-_ ]?(install|center)/i)
  assert.doesNotMatch(profile, /agent[-_ ]?token|skill[-_ ]?(install|center)/i)
  assert.match(marketDetail, /indicator\?\.local_copy_id/)
  assert.match(purchases, /item\.local_copy_id/)
})

test('mobile safety states are visible before strategy mutations', () => {
  const strategyDetail = read('src/views/trading/StrategyDetail.vue')
  const strategyList = read('src/views/trading/index.vue')

  assert.match(strategyDetail, /hasUnmanagedPosition/)
  assert.match(strategyDetail, /stopped_with_positions/)
  assert.match(strategyDetail, /:disabled="hasOpenExposure"/)
  assert.match(strategyDetail, /delete_blocked_exposure/)
  assert.match(strategyList, /strategyNeedsAttention\(strategy\)/)
  assert.match(strategyList, /strategyHasExposure\(strategy\)/)
  assert.match(strategyList, /restart_with_position_title/)
})

test('notifications are grouped, categorized, and customer-readable', () => {
  const notifications = read('src/views/profile/Notifications.vue')

  assert.match(notifications, /groupedNotifications\(\)/)
  assert.match(notifications, /30 \* 60 \* 1000/)
  assert.match(notifications, /categoryFilters\(\)/)
  assert.match(notifications, /notifications\.action_\$\{action\}/)
  assert.match(notifications, /technical-details/)
  assert.match(notifications, /view_strategy/)
})

test('signal and live configuration expose only relevant fields', () => {
  const createStrategy = read('src/views/trading/CreateStrategy.vue')

  assert.match(createStrategy, /v-if="form\.executionMode === 'live'"/)
  assert.match(createStrategy, /formValid\(\)/)
  assert.match(createStrategy, /form\.executionMode !== 'live'\) return true/)
  assert.match(createStrategy, /:disabled="!formValid"/)
  assert.doesNotMatch(createStrategy, /创建机器人/)
})

test('market, chart, and accounts provide a complete mobile path', () => {
  const market = read('src/views/market/index.vue')
  const chart = read('src/views/indicator/Chart.vue')
  const credentials = read('src/views/profile/Credentials.vue')

  assert.match(market, /emptyStateTitle/)
  assert.match(market, /view_my_strategies/)
  assert.match(market, /role="tab"/)
  assert.match(chart, /priceTicks\(\)/)
  assert.match(chart, /timeTicks\(\)/)
  assert.match(chart, /latestSignalLabel/)
  assert.ok(credentials.indexOf('primary-list') < credentials.indexOf('Egress IP card'))
  assert.match(credentials, /credentialHealthLabel/)
})

test('AI composer stays at the bottom and uses a text send action', () => {
  const aiHub = read('src/views/ai-hub/index.vue')
  const api = read('src/api/index.js')

  assert.match(aiHub, /\{\{ text\.send \}\}/)
  assert.match(aiHub, /\.bottom-suggestions\s*\{\s*margin-top: auto;/)
  assert.doesNotMatch(aiHub, /copilot-body\.empty \.bottom-suggestions/)
  assert.match(aiHub, /\.send-action[\s\S]*min-width: 72px/)
  assert.match(aiHub, /sendMessageReliable\(payload, pendingMsg\)/)
  assert.match(aiHub, /await this\.sendMessageStream\(payload, pendingMsg\)[\s\S]*aiChatApi\.sendMessage\(\{/)
  assert.match(api, /sendMessage: \(payload\) => http\.post\('\/api\/ai\/chat\/message', payload, \{ timeout: 600000 \}\)/)
  assert.match(api, /streamMessage:[\s\S]*\/api\/ai\/chat\/message\/stream/)
  assert.match(api, /if \(await handlePart\(part\) === 'done'\)[\s\S]*await reader\.cancel\(\)/)
  assert.match(aiHub, /if \(!streamResult\?\.completed\)[\s\S]*throw new Error\(this\.text\.streamIncomplete\)/)
  assert.match(aiHub, /error\.streamAccepted = streamAccepted[\s\S]*if \(error\?\.streamAccepted \|\| error\?\.streamHasContent\)[\s\S]*return/)
  assert.match(aiHub, /event === 'replace'[\s\S]*content: text/)
  assert.match(aiHub, /event === 'warning'[\s\S]*streamWarning/)
})

test('signal chart supports mobile history navigation and candle inspection', () => {
  const chart = read('src/views/indicator/Chart.vue')

  assert.match(chart, /@pointerdown="onChartPointerDown"/)
  assert.match(chart, /@pointermove="onChartPointerMove"/)
  assert.match(chart, /@wheel\.prevent="onChartWheel"/)
  assert.match(chart, /zoomChart\(direction\)/)
  assert.match(chart, /volumeShapes\(\)/)
  assert.match(chart, /selectedCandleShape\(\)/)
  assert.match(chart, /candle-inspector/)
  assert.match(chart, /limit: 240/)
  assert.doesNotMatch(chart, /strategyApi|orderApi|backtestApi/)
})
