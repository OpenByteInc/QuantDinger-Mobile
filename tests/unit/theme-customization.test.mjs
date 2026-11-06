import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8')

test('the mobile product uses one fixed Global Ivory appearance', async () => {
  const [baseStyles, v2Styles, accountStyles, appShell, settings, languagePage] = await Promise.all([
    read('src/styles/index.css'),
    read('src/styles/v2.css'),
    read('src/styles/account-pages.css'),
    read('src/App.vue'),
    read('src/stores/index.js'),
    read('src/views/profile/Language.vue')
  ])

  assert.match(baseStyles, /--bg: #faf8f3/)
  assert.match(baseStyles, /--bg-elevated: #f6f4ef/)
  assert.match(baseStyles, /--border: rgba\(24, 25, 29, 0\.11\)/)
  assert.match(v2Styles, /--v2-surface: #f6f4ef/)
  assert.match(v2Styles, /--v2-line: rgba\(24,25,29,\.11\)/)
  assert.match(appShell, /\.app-container\.ivory-shell[\s\S]*--v2-surface: #f6f4ef/)
  assert.match(appShell, /\.app-container\.ivory-shell[\s\S]*--bg-elevated: #f6f4ef/)
  assert.doesNotMatch(`${baseStyles}${v2Styles}${appShell}`, /#(?:f2e7d7|eadbc6)/i)
  assert.doesNotMatch(appShell, /\.app-container\.ivory-shell[\s\S]*--(?:v2-surface|bg-elevated): #fffdf8/)
  assert.match(v2Styles, /--v2-brand: #0e603f/)
  assert.match(v2Styles, /\.v2-card[^}]*background: transparent/)
  assert.match(accountStyles, /background: transparent !important/)
  assert.match(accountStyles, /\.account-page \.van-cell-group--inset/)
  assert.doesNotMatch(`${baseStyles}${v2Styles}`, /data-(?:theme|accent)/)
  assert.doesNotMatch(settings, /setTheme|setAccent|theme:|accent:/)
  assert.doesNotMatch(languagePage, /displayMode|accentColor|setTheme|setAccent/)
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
