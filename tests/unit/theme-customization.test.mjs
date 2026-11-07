import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('the mobile product supports persistent Global Ivory light and editorial dark appearances', async () => {
  const [baseStyles, v2Styles, accountStyles, appShell, settings, languagePage, entry] = await Promise.all([
    read('src/styles/index.css'),
    read('src/styles/v2.css'),
    read('src/styles/account-pages.css'),
    read('src/App.vue'),
    read('src/stores/index.js'),
    read('src/views/profile/Language.vue'),
    read('src/main.js')
  ])

  assert.match(baseStyles, /--bg: #fbf7ef/)
  assert.match(baseStyles, /--bg-elevated: #f6f4ef/)
  assert.match(baseStyles, /--border: rgba\(24, 25, 29, 0\.11\)/)
  assert.match(v2Styles, /--v2-bg: #fbf7ef/)
  assert.match(v2Styles, /--v2-surface: #f6f4ef/)
  assert.match(v2Styles, /--v2-line: rgba\(24,25,29,\.11\)/)
  assert.match(appShell, /\.app-container\.ivory-shell,[\s\S]*background: var\(--bg\)/)
  assert.match(appShell, /\.app-container\.ivory-shell[\s\S]*--v2-bg: var\(--bg\)/)
  assert.match(appShell, /\.app-container\.ivory-shell[\s\S]*--v2-surface: var\(--bg-elevated\)/)
  assert.doesNotMatch(`${baseStyles}${v2Styles}${appShell}`, /#(?:f2e7d7|eadbc6)/i)
  assert.doesNotMatch(appShell, /\.app-container\.ivory-shell[\s\S]*--(?:v2-surface|bg-elevated): #fffdf8/)
  assert.match(v2Styles, /--v2-brand: #0e603f/)
  assert.match(v2Styles, /\.v2-card[^}]*background: transparent/)
  assert.match(accountStyles, /background: transparent !important/)
  assert.match(accountStyles, /\.account-page \.van-cell-group--inset/)
  assert.match(baseStyles, /html\[data-theme='dark'\]/)
  assert.match(baseStyles, /--bg: #111713/)
  assert.match(v2Styles, /html\[data-theme='dark'\]/)
  assert.match(settings, /theme: readInitialTheme\(\)/)
  assert.match(settings, /setTheme\(theme\)/)
  assert.match(settings, /toggleTheme\(\)/)
  assert.doesNotMatch(settings, /setAccent|accent:/)
  assert.doesNotMatch(languagePage, /displayMode|accentColor|setTheme|setAccent/)
  assert.match(entry, /dark \? Style\.Dark : Style\.Light/)
  assert.match(entry, /void syncStatusBar\(\)/)
})

test('login initializes the settings store before rendering locale controls', async () => {
  const login = await read('src/views/login/index.vue')

  assert.match(login, /import \{ useSettingsStore, useUserStore \} from '@\/stores'/)
  assert.match(login, /settingsStore: useSettingsStore\(\)/)
  assert.match(login, /\.brand-copy h1 \{[\s\S]*font-family: var\(--font-display\)/)
  assert.match(login, /\.login-page \.login-shell \.input-wrapper \{[\s\S]*background: var\(--bg-elevated\)/)
  assert.match(login, /\.tab\.active::after \{[\s\S]*background: var\(--accent-gold\)/)
  assert.doesNotMatch(login, /\.brand-copy h1 \{[^}]*font-weight: (?:7|8|9)\d\d/)
})

test('profile menu pages share the continuous ivory content treatment', async () => {
  const [accountStyles, notificationSettings, credits, credentialForm, purchases] = await Promise.all([
    read('src/styles/account-pages.css'),
    read('src/views/profile/NotificationSettings.vue'),
    read('src/views/profile/Credits.vue'),
    read('src/views/profile/CredentialForm.vue'),
    read('src/views/market/MyPurchases.vue')
  ])

  assert.match(notificationSettings, /class="notif-settings-page account-page"/)
  assert.match(credits, /class="credits-page account-page"/)
  assert.match(credentialForm, /class="credential-form-page account-page"/)
  assert.match(accountStyles, /\.reward-summary,[\s\S]*\.records-section/)
  assert.match(accountStyles, /\.account-page\.notif-settings-page \.card/)
  assert.match(accountStyles, /\.account-page\.page \.list/)
  assert.match(purchases, /class="page account-page"/)
})

test('market home keeps the Global Ivory financial palette', async () => {
  const source = await read('src/views/v2/StrategyHub.vue')

  assert.match(source, /--ivory: #fbf7ef/)
  assert.match(source, /--forest: #0e603f/)
  assert.match(source, /--gold: #b08a42/)
  assert.match(source, /--burgundy: #8b2437/)
  assert.doesNotMatch(source, /var\(--v2-brand\)/)
})

test('primary mobile screens use a restrained sans and editorial serif type system', async () => {
  const [baseStyles, entry, packageFile, market, live, research, profile, chart, marketChart, trade] = await Promise.all([
    read('src/styles/index.css'),
    read('src/main.js'),
    read('package.json'),
    read('src/views/v2/StrategyHub.vue'),
    read('src/views/v2/LiveOverview.vue'),
    read('src/views/v2/AiResearch.vue'),
    read('src/views/v2/ProfileHub.vue'),
    read('src/views/indicator/Chart.vue'),
    read('src/components/MarketChart.vue'),
    read('src/components/ChartTradePanel.vue')
  ])
  const primaryScreens = `${market}${live}${research}${profile}${chart}${trade}`
  assert.match(baseStyles, /--font-sans:/)
  assert.match(baseStyles, /--font-display: 'Source Serif 4 Variable'/)
  assert.match(entry, /@fontsource-variable\/source-serif-4'/)
  assert.match(packageFile, /"@fontsource-variable\/source-serif-4": "\^5\.3\.1"/)
  assert.match(market, /font-family: var\(--font-display\)/)
  assert.match(research, /\.research-shell \{ font-family: var\(--font-sans\); \}/)
  assert.match(research, /\.research-shell :deep\(\.welcome-title-row span\)[\s\S]*font-family: var\(--font-display\)/)
  assert.match(chart, /font-family: var\(--font-display\)/)
  assert.match(marketChart, /upColor:'#0e603f'/)
  assert.match(marketChart, /downColor:'#8b2437'/)
  assert.match(marketChart, /indicator:\{bars:\[\{upColor:'#0e603f',downColor:'#8b2437'/)
  assert.match(baseStyles, /:where\(h1, h2, h3\)[\s\S]*font-family: var\(--font-display\)/)
  assert.match(baseStyles, /button\[aria-selected='true'\]/)
  assert.doesNotMatch(primaryScreens, /Times New Roman/)
})

test('dark mode keeps the profile toggle accessible and the AI mark visible', async () => {
  const [profile, baseStyles, quantCat] = await Promise.all([
    read('src/views/v2/ProfileHub.vue'),
    read('src/styles/index.css'),
    read('src/components/QuantCat.vue')
  ])

  assert.match(profile, /t\('sidebar\.theme_toggle'\)/)
  assert.match(profile, /settingsStore\.toggleTheme\(\)/)
  assert.match(profile, /class="theme-icon theme-icon-sun"/)
  assert.match(profile, /class="theme-icon theme-icon-moon"/)
  assert.doesNotMatch(profile, /profile-theme-toggle[^>]*>[\s\S]{0,220}profile\.theme_(?:light|dark)/)
  assert.match(baseStyles, /html\[data-theme='dark'\] \.quant-cat \.cat-art[\s\S]*filter: invert/)
  assert.doesNotMatch(quantCat, /:global\(html\[data-theme='dark'\]\)/)
})

test('phone layouts use compact spacing without sparse metric cells', async () => {
  const [profile, chart, tradePanel, research, strategyDetail] = await Promise.all([
    read('src/views/v2/ProfileHub.vue'),
    read('src/views/indicator/Chart.vue'),
    read('src/components/ChartTradePanel.vue'),
    read('src/views/v2/AiResearch.vue'),
    read('src/views/trading/StrategyDetail.vue')
  ])

  assert.match(profile, /@media \(max-width: 430px\)[\s\S]*\.stats button \{ min-height: 44px; \}[\s\S]*\.account \{ min-height: 64px;/)
  assert.match(chart, /@media \(max-width: 430px\)[\s\S]*\.signal-summary \{ margin: 8px 12px 0; padding: 9px 0; \}/)
  assert.match(tradePanel, /@media \(max-width: 430px\)[\s\S]*\.compact-select-trigger \{ min-height: 36px;[\s\S]*\.depth-row \{ min-height: 21px; \}/)
  assert.match(research, /@media \(max-width: 430px\)[\s\S]*\.research-shell :deep\(\.top-bar\)[\s\S]*margin-bottom: 10px;[\s\S]*\.research-shell :deep\(\.starter-grid button\) \{ min-height: 48px;/)
  assert.match(strategyDetail, /@media \(max-width:430px\)\{\.metric-section\{padding:14px 0\}\.metric-grid\{grid-template-columns:repeat\(6,minmax\(0,1fr\)\)/)
  assert.match(strategyDetail, /\.metric-grid article:nth-child\(n\+4\)\{grid-column:span 3;border-top:1px solid var\(--v2-line\)\}/)
})
