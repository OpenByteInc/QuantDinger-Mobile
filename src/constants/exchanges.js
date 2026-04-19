// Exchange brand metadata (aligned with PC side)

export const EXCHANGE_BRANDS = {
  binance: {
    name: 'Binance',
    short: 'BN',
    brandBg: 'rgba(243, 186, 47, 0.18)',
    brandColor: '#f0b90b'
  },
  okx: {
    name: 'OKX',
    short: 'OK',
    brandBg: 'rgba(209, 213, 219, 0.18)',
    brandColor: '#e5e7eb'
  },
  bybit: {
    name: 'Bybit',
    short: 'BY',
    brandBg: 'rgba(247, 166, 0, 0.18)',
    brandColor: '#f7a600'
  },
  bitget: {
    name: 'Bitget',
    short: 'BG',
    brandBg: 'rgba(0, 193, 255, 0.18)',
    brandColor: '#00c1ff'
  },
  gate: {
    name: 'Gate.io',
    short: 'GT',
    brandBg: 'rgba(42, 93, 255, 0.18)',
    brandColor: '#5b8cff'
  },
  htx: {
    name: 'HTX',
    short: 'HX',
    brandBg: 'rgba(22, 119, 255, 0.18)',
    brandColor: '#5ea8ff'
  },
  kucoin: {
    name: 'KuCoin',
    short: 'KC',
    brandBg: 'rgba(35, 185, 132, 0.18)',
    brandColor: '#23b984'
  },
  kraken: {
    name: 'Kraken',
    short: 'KR',
    brandBg: 'rgba(135, 119, 236, 0.18)',
    brandColor: '#a898ff'
  },
  coinbaseexchange: {
    name: 'Coinbase',
    short: 'CB',
    brandBg: 'rgba(16, 101, 247, 0.18)',
    brandColor: '#5b8cff'
  },
  bitfinex: {
    name: 'Bitfinex',
    short: 'BF',
    brandBg: 'rgba(74, 222, 128, 0.18)',
    brandColor: '#4ade80'
  },
  deepcoin: {
    name: 'Deepcoin',
    short: 'DC',
    brandBg: 'rgba(139, 92, 246, 0.18)',
    brandColor: '#c4b5fd'
  }
}

export const EXCHANGE_OPTIONS = Object.keys(EXCHANGE_BRANDS).map((id) => ({
  value: id,
  label: EXCHANGE_BRANDS[id].name
}))

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
    signupUrl: 'https://www.gateport.company/share/DINGER'
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
