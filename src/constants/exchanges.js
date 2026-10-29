// Exchange brand metadata (aligned with PC side)

export const EXCHANGE_BRANDS = {
  alpaca: { name: 'Alpaca', docsUrl: 'https://app.alpaca.markets/' },
  ibkr: { name: 'Interactive Brokers', short: 'IB', docsUrl: 'https://www.interactivebrokers.com/' },
  tiger: {
    name: 'Tiger Brokers',
    short: 'TB',
    brandBg: 'rgba(255, 107, 0, 0.18)',
    brandColor: '#ff7a1a',
    docsUrl: 'https://quant.itigerup.com/openapi/en/python/overview/introduction.html'
  },
  webull: {
    name: 'Webull',
    short: 'WB',
    brandBg: 'rgba(36, 85, 245, 0.18)',
    brandColor: '#5b7cff',
    docsUrl: 'https://developer.webull.com/'
  },
  binance: {
    name: 'Binance',
    short: 'BN',
    brandBg: 'rgba(243, 186, 47, 0.18)',
    brandColor: '#f0b90b',
    docsUrl: 'https://www.binance.com/en/support/faq/detail/360002502072'
  },
  okx: {
    name: 'OKX',
    short: 'OK',
    brandBg: 'rgba(209, 213, 219, 0.18)',
    brandColor: '#e5e7eb',
    docsUrl: 'https://www.okx.com/docs-v5/zh/#overview-v5-api-key-creation'
  },
  bybit: {
    name: 'Bybit',
    short: 'BY',
    brandBg: 'rgba(247, 166, 0, 0.18)',
    brandColor: '#f7a600',
    docsUrl: 'https://www.bybit.com/en/help-center/article/How-to-create-your-API-key/'
  },
  bitget: {
    name: 'Bitget',
    short: 'BG',
    brandBg: 'rgba(0, 193, 255, 0.18)',
    brandColor: '#00c1ff',
    docsUrl: 'https://www.bitget.com/api-doc/common/quick-start'
  },
  gate: {
    name: 'Gate.io',
    short: 'GT',
    brandBg: 'rgba(42, 93, 255, 0.18)',
    brandColor: '#5b8cff',
    docsUrl: 'https://www.gate.com/docs/developers/apiv4/'
  },
  htx: {
    name: 'HTX',
    short: 'HX',
    brandBg: 'rgba(22, 119, 255, 0.18)',
    brandColor: '#5ea8ff',
    docsUrl: 'https://www.htx.com/en-us/opend/newApiPages/?id=414'
  },
  kucoin: {
    name: 'KuCoin',
    short: 'KC',
    brandBg: 'rgba(35, 185, 132, 0.18)',
    brandColor: '#23b984',
    docsUrl: 'https://www.kucoin.com/docs-new/authentication'
  },
  kraken: {
    name: 'Kraken',
    short: 'KR',
    brandBg: 'rgba(135, 119, 236, 0.18)',
    brandColor: '#a898ff',
    docsUrl: 'https://support.kraken.com/articles/360000919966-how-to-create-an-api-key'
  },
  coinbaseexchange: {
    name: 'Coinbase',
    short: 'CB',
    brandBg: 'rgba(16, 101, 247, 0.18)',
    brandColor: '#5b8cff',
    docsUrl: 'https://docs.cdp.coinbase.com/exchange/rest-api/authentication'
  },
  bitfinex: {
    name: 'Bitfinex',
    short: 'BF',
    brandBg: 'rgba(74, 222, 128, 0.18)',
    brandColor: '#4ade80',
    docsUrl: 'https://docs.bitfinex.com/docs/create-an-api-key'
  }
}

export const SUPPORTED_TRADING_EXCHANGE_IDS = ['binance', 'okx', 'bitget', 'bybit', 'gate', 'htx']

export const STOCK_BROKER_IDS = ['alpaca', 'ibkr', 'tiger', 'webull']
export const DIRECT_OPENAPI_BROKER_IDS = ['tiger', 'webull']
export const US_STOCK_BROKER_IDS = new Set(STOCK_BROKER_IDS)
export const HK_STOCK_BROKER_IDS = new Set(['tiger'])

export const EXCHANGE_OPTIONS = [...SUPPORTED_TRADING_EXCHANGE_IDS, 'alpaca', 'tiger', 'webull'].map((id) => ({
  value: id,
  label: EXCHANGE_BRANDS[id].name
}))

export const isStockBroker = (id) => STOCK_BROKER_IDS.includes(String(id || '').trim().toLowerCase())
export const isDirectOpenApiBroker = (id) => DIRECT_OPENAPI_BROKER_IDS.includes(String(id || '').trim().toLowerCase())
export const brokerCurrency = (id, market = 'USStock') => {
  const normalizedMarket = String(market || '').trim().toLowerCase()
  if (normalizedMarket === 'hkstock' || normalizedMarket === 'hk') return 'HKD'
  return isStockBroker(id) ? 'USD' : 'USDT'
}

// One-click signup cards (aligned with PC rebate partners)
export const EXCHANGE_SIGNUP_CARDS = [
  {
    id: 'binance',
    name: 'Binance',
    short: 'BN',
    brandBg: 'rgba(243, 186, 47, 0.18)',
    brandColor: '#f0b90b',
    signupUrl: 'https://www.bsmkweb.cc/register?ref=QUANTDINGER'
  },
  {
    id: 'bitget',
    name: 'Bitget',
    short: 'BG',
    brandBg: 'rgba(0, 193, 255, 0.18)',
    brandColor: '#00c1ff',
    signupUrl: 'https://partner.hdmune.cn/bg/7r4xz8kd'
  },
  {
    id: 'bybit',
    name: 'Bybit',
    short: 'BY',
    brandBg: 'rgba(247, 166, 0, 0.18)',
    brandColor: '#f7a600',
    signupUrl: 'https://partner.bybit.com/b/DINGER'
  },
  {
    id: 'okx',
    name: 'OKX',
    short: 'OK',
    brandBg: 'rgba(209, 213, 219, 0.18)',
    brandColor: '#e5e7eb',
    signupUrl: 'https://www.xqmnobxky.com/join/QUANTDINGER'
  },
  {
    id: 'gate',
    name: 'Gate.io',
    short: 'GT',
    brandBg: 'rgba(42, 93, 255, 0.18)',
    brandColor: '#5b8cff',
    signupUrl: 'https://www.gateport.business/share/DINGER'
  },
  {
    id: 'htx',
    name: 'HTX',
    short: 'HX',
    brandBg: 'rgba(22, 119, 255, 0.18)',
    brandColor: '#5ea8ff',
    signupUrl: 'https://www.htx.com/invite/zh-cn/1f?invite_code=dinger'
  }
]
