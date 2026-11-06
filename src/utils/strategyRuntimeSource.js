import { formatStrategyInstrumentIdentity, parseStrategyInstrumentIdentity } from './strategyInstrument.js'

function replacePrimaryTimeframeReferences(source, previousTimeframe, nextTimeframe) {
  const previous = String(previousTimeframe || '').trim().toLowerCase()
  const next = String(nextTimeframe || '').trim()
  if (!next) return source
  const subscribed = new Set(Array.from(source.matchAll(/context\.subscribe\([^)]*?frequency\s*=\s*["']([^"']+)["']/g)).map(match => String(match[1] || '').trim().toLowerCase()).filter(Boolean))
  const shouldReplace = value => {
    const normalized = String(value || '').trim().toLowerCase()
    if (!normalized) return false
    if (previous && normalized === previous) return true
    return subscribed.size === 1 && !subscribed.has(normalized)
  }
  const replaceLiteral = (match, prefix, quote, value) => shouldReplace(value) ? `${prefix}${JSON.stringify(next)}` : match
  let updated = source.replace(/(\bget_history\s*\(\s*[^,]+,\s*)(["'])([^"']+)\2/g, replaceLiteral)
  updated = updated.replace(/(\b(?:get_history|data\.history)\s*\([^)]*?\bfrequency\s*=\s*)(["'])([^"']+)\2/g, replaceLiteral)
  return updated
}

export function extractStrategyRuntimeConfigFromCode(code) {
  const source = String(code || '')
  const instrumentMatch = source.match(/^\s*INSTRUMENT\s*=\s*["']([^"']+)["']/m) || source.match(/^\s*g\.symbol\s*=\s*["']([^"']+)["']/m) || source.match(/context\.set_universe\(\s*(?:instruments\s*=\s*)?\[\s*["']([^"']+)["']/m)
  const timeframeMatch = source.match(/^\s*TIMEFRAME\s*=\s*["']([^"']+)["']/m) || source.match(/context\.subscribe\([^)]*?frequency\s*=\s*["']([^"']+)["']/m) || source.match(/^\s*#\s*timeframe\s*:\s*([^\s#]+)/im)
  const exchangeMatch = source.match(/^\s*(?:g\.)?(?:exchange_id|exchangeId|exchange)\s*=\s*["']([^"']+)["']/m) || source.match(/context\.set_exchange\(\s*["']([^"']+)["']/m)
  const directionMatch = source.match(/^\s*g\.trade_direction\s*=\s*["'](long|short|both)["']/im) || source.match(/^\s*#\s*trade_direction\s*:\s*(long|short|both)\b/im)
  const equityTakeProfitMatch = source.match(/^\s*EQUITY_TAKE_PROFIT\s*=\s*([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)\s*$/im)
  const equityStopLossMatch = source.match(/^\s*EQUITY_STOP_LOSS\s*=\s*([-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[-+]?\d+)?)\s*$/im)
  const instrument = String(instrumentMatch?.[1] || '').trim()
  const result = {}
  if (instrument) {
    const parsed = parseStrategyInstrumentIdentity(instrument)
    result.market_category = parsed.market
    result.symbol = parsed.symbol
    result.market_type = parsed.marketType
    if (parsed.exchangeId) result.exchange_id = parsed.exchangeId
  }
  if (timeframeMatch?.[1]) result.timeframe = String(timeframeMatch[1]).trim()
  if (exchangeMatch?.[1]) result.exchange_id = String(exchangeMatch[1]).trim().toLowerCase()
  if (directionMatch?.[1]) result.trade_direction = String(directionMatch[1]).trim().toLowerCase()
  if (equityTakeProfitMatch) result.equity_take_profit_pct = Math.max(0, Number(equityTakeProfitMatch[1]) || 0)
  if (equityStopLossMatch) result.equity_stop_loss_pct = Math.max(0, Number(equityStopLossMatch[1]) || 0)
  return result
}

export function strategyCodeUsesExplicitExchange(code) {
  return /\b(?:exchange_id|exchangeId|exchange)\b\s*=|\bset_exchange\s*\(/i.test(String(code || ''))
}

export function extractStrategyRuntimeContractFromCode(code) {
  const source = String(code || '')
  const config = extractStrategyRuntimeConfigFromCode(source)
  const instrumentMatch = source.match(/^\s*INSTRUMENT\s*=\s*["']([^"']+)["']/m) || source.match(/^\s*g\.symbol\s*=\s*["']([^"']+)["']/m) || source.match(/context\.set_universe\(\s*(?:instruments\s*=\s*)?\[\s*["']([^"']+)["']/m)
  const instrument = String(instrumentMatch?.[1] || '')
  const hasInstrument = Boolean(instrumentMatch && config.symbol)
  return {
    config,
    hasInstrument,
    hasProduct: hasInstrument && config.market_category === 'Crypto' && /@(?:[^@:\s]+:)?(spot|swap)$/i.test(instrument),
    hasTimeframe: Boolean(config.timeframe),
    hasExchange: Boolean(config.exchange_id && strategyCodeUsesExplicitExchange(source)),
    hasDirection: Boolean(config.trade_direction),
    hasControls: Boolean(hasInstrument || config.timeframe || config.exchange_id || config.trade_direction)
  }
}

export function applyStrategyRuntimeConfigToCode(code, config = {}) {
  const source = String(code || '')
  if (!source) return source
  const parsed = parseStrategyInstrumentIdentity(config.symbol || config.instrument || '', config)
  const instrument = formatStrategyInstrumentIdentity({ ...config, symbol: parsed.symbol, exchange_id: strategyCodeUsesExplicitExchange(source) ? config.exchange_id : '' }, { includeConfigExchange: strategyCodeUsesExplicitExchange(source) })
  const timeframe = String(config.timeframe || '').trim()
  const tradeDirection = String(config.trade_direction || '').trim().toLowerCase()
  let next = source
  if (instrument) {
    const quoted = JSON.stringify(instrument)
    next = next.replace(/(^\s*INSTRUMENT\s*=\s*)["'][^"']+["']/m, `$1${quoted}`)
    next = next.replace(/(^\s*g\.symbol\s*=\s*)["'][^"']+["']/m, `$1${quoted}`)
    next = next.replace(/(context\.set_universe\(\s*(?:instruments\s*=\s*)?\[\s*)["'][^"']+["'](\s*\]\s*\))/m, `$1${quoted}$2`)
    next = next.replace(
      /(context\.set_benchmark\(\s*)["'][^"']+["'](\s*\))/m,
      `$1${JSON.stringify(config.market_category === 'Crypto'
        ? formatStrategyInstrumentIdentity({ ...config, symbol: parsed.symbol, market_type: 'spot' })
        : instrument)}$2`
    )
  }
  if (config.market_category === 'Crypto' && config.market_type) {
    if (String(config.market_type).toLowerCase() === 'spot') next = next.replace(/^(\s*)context\.allow_leverage\(([^)]*)\)\s*$/m, '$1# runtime_product_leverage: context.allow_leverage($2)')
    else next = next.replace(/^(\s*)#\s*runtime_product_leverage:\s*context\.allow_leverage\(([^)]*)\)\s*$/m, '$1context.allow_leverage($2)')
  }
  if (timeframe) {
    next = replacePrimaryTimeframeReferences(next, extractStrategyRuntimeConfigFromCode(source).timeframe, timeframe)
    next = next.replace(/(^\s*TIMEFRAME\s*=\s*)["'][^"']+["']/m, `$1${JSON.stringify(timeframe)}`)
    next = next.replace(/(context\.subscribe\([^)]*?frequency\s*=\s*)["'][^"']+["']/m, `$1${JSON.stringify(timeframe)}`)
    next = next.replace(/(^\s*#\s*timeframe\s*:\s*)[^\s#]+/im, `$1${timeframe}`)
  }
  if (config.exchange_id) {
    next = next.replace(/(^\s*(?:g\.)?(?:exchange_id|exchangeId|exchange)\s*=\s*)["'][^"']+["']/m, `$1${JSON.stringify(String(config.exchange_id).toLowerCase())}`)
    next = next.replace(/(context\.set_exchange\(\s*)["'][^"']+["'](\s*\))/m, `$1${JSON.stringify(String(config.exchange_id).toLowerCase())}$2`)
  }
  if (['long', 'short', 'both'].includes(tradeDirection)) {
    next = next.replace(/(^\s*g\.trade_direction\s*=\s*)["'][^"']+["']/m, `$1${JSON.stringify(tradeDirection)}`)
    next = next.replace(/(^\s*#\s*trade_direction\s*:\s*)[^\s#]+/im, `$1${tradeDirection}`)
  }
  return next
}

const SOURCE_OWNED_EXECUTION_KEYS = [
  'strategy_family',
  'executor_type',
  'executor_config',
  'executor_preview',
  'bot_type',
  'bot_params'
]

export function strategyCodeOwnsExecutionConfig(code) {
  const match = String(code || '').match(/^\s*GRID_TEMPLATE_VERSION\s*=\s*(\d+)\s*$/m)
  return Boolean(match && Number(match[1]) >= 7)
}

export function strategyCodeDeclaredFamily(code) {
  const match = String(code || '').match(/\bstrategy_family\s*=\s*["']([^"']+)["']/i)
  return String(match?.[1] || '').trim().toLowerCase().replace(/-/g, '_')
}

export function sanitizeRuntimeConfigForSource(config = {}, code = '') {
  const next = { ...(config && typeof config === 'object' ? config : {}) }
  const declaredFamily = strategyCodeDeclaredFamily(code)
  const declaredNonRobot = declaredFamily && !['robot', 'grid', 'dca', 'martingale', 'layered_martingale'].includes(declaredFamily)
  if (!strategyCodeOwnsExecutionConfig(code) && !declaredNonRobot) return next
  SOURCE_OWNED_EXECUTION_KEYS.forEach(key => delete next[key])
  if (declaredNonRobot) next.strategy_family = declaredFamily
  return next
}

function escapeForRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function parsePythonLiteral(raw) {
  const text = String(raw == null ? '' : raw).trim()
  if (!text) return ''
  if (text === 'True') return true
  if (text === 'False') return false
  if (text === 'None') return null
  const quote = text[0]
  if ((quote === '"' || quote === "'") && text[text.length - 1] === quote) return text.slice(1, -1)
  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : text
}

function paramNameParts(name) {
  return String(name || '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
}

function isPeriodLikeParamName(name) {
  const key = String(name || '').toLowerCase()
  const parts = paramNameParts(key)
  const periodTokens = ['period', 'lookback', 'window', 'length', 'len', 'bars', 'ema', 'sma', 'rsi', 'adx', 'ma']
  const nonPeriodTokens = ['pct', 'percent', 'ratio', 'rate', 'mult', 'multiplier', 'threshold', 'distance', 'width', 'bandwidth', 'risk', 'target', 'stop', 'pullback', 'activation']
  if (parts.some(token => nonPeriodTokens.includes(token))) return false
  return periodTokens.includes(key) || periodTokens.some(token => key.endsWith(`_${token}`)) || key.endsWith('_atr_period')
}

function isPercentParamName(name, value) {
  const key = String(name || '').toLowerCase()
  if (isPeriodLikeParamName(key)) return false
  return /(pct|percent|ratio|allocation|weight|position|take_profit|stop|arm)/.test(key) && typeof value === 'number'
}

function inferParamType(name, value) {
  const key = String(name || '').toLowerCase()
  if (typeof value === 'boolean') return 'boolean'
  if (isPercentParamName(name, value)) return 'percent'
  if (Number.isInteger(value)) return 'integer'
  if (typeof value === 'number') return 'number'
  if (key.endsWith('_mode') || key.endsWith('_type')) return 'text'
  return 'text'
}

function inferParamDefaults(name, value, type) {
  if (type === 'percent') return { default: Number.isFinite(Number(value)) ? Number(value) : 0, min: 0, max: 1, step: 0.001 }
  if (type === 'integer') {
    const key = String(name || '').toLowerCase()
    const positiveWindow = isPeriodLikeParamName(key)
    const zeroAllowed = /(cooldown|delay|wait|pause)/.test(key)
    return {
      default: Number.isFinite(value) ? value : 1,
      min: positiveWindow && !zeroAllowed ? 1 : (zeroAllowed ? 0 : undefined),
      max: positiveWindow && !zeroAllowed ? 500 : undefined,
      step: 1
    }
  }
  if (type === 'number') return { default: Number.isFinite(value) ? value : 0, step: 0.1 }
  return { default: value == null ? '' : value }
}

const STRATEGY_ANNOTATION_SCHEMA = {
  entryPct: { type: 'percent', min: 0.01, max: 1, step: 0.01 },
  stopLossPct: { type: 'percent', min: 0, max: 1, step: 0.001 },
  takeProfitPct: { type: 'percent', min: 0, max: 5, step: 0.001 },
  trailingEnabled: { type: 'boolean' },
  trailingStopPct: { type: 'percent', min: 0, max: 1, step: 0.001 },
  trailingActivationPct: { type: 'percent', min: 0, max: 1, step: 0.001 },
  maxHoldingBars: { type: 'integer', min: 0, max: 100000, step: 1 }
}

function parseStrategyAnnotationValue(name, raw) {
  const schema = STRATEGY_ANNOTATION_SCHEMA[name]
  const text = String(raw == null ? '' : raw).trim()
  if (!schema) return text
  if (schema.type === 'boolean') return /^(true|1|yes|on)$/i.test(text)
  const numeric = Number(text)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseParamKeywordOptions(raw, type) {
  if (!['integer', 'number', 'percent'].includes(type)) return {}
  const text = String(raw || '')
  const result = {}
  ;['min', 'max', 'step'].forEach(key => {
    const match = text.match(new RegExp(`(?:^|,)\\s*${key}\\s*=\\s*(-?\\d+(?:\\.\\d+)?(?:[eE][-+]?\\d+)?)`, 'i'))
    const value = Number(match?.[1])
    if (match && Number.isFinite(value)) result[key] = value
  })
  return result
}

function parseDeclaredRange(description, type) {
  const text = String(description || '')
  const rangeMatch = text.match(/range\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)/i)
  if (rangeMatch && ['integer', 'number', 'percent'].includes(type)) {
    const [min, max, step] = rangeMatch.slice(1).map(Number)
    if ([min, max, step].every(Number.isFinite) && step > 0) return { min, max, step }
  }
  const valuesMatch = text.match(/values\s*=\s*([^\s]+)/i)
  if (!valuesMatch) return {}
  const values = valuesMatch[1].split(',').map(item => item.trim()).filter(Boolean).map(item => {
    const numeric = Number(item)
    return Number.isFinite(numeric) ? numeric : item
  })
  return values.length ? { values } : {}
}

function isRuntimeReservedParam(name) {
  return ['direction', 'trade_direction', 'market_type', 'markettype', 'symbol', 'timeframe', 'tick_interval_sec', 'leverage', 'investment_amount', 'initial_capital', 'base_notional']
    .includes(String(name || '').trim().toLowerCase())
}

export function extractScriptParamsFromCode(code) {
  const source = String(code || '')
  const seen = new Set()
  const params = []
  let match
  const paramPattern = /ctx\.param\(\s*['"]([^'"]+)['"]\s*,\s*((?:[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?|True|False|None|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'))(?:\s*,\s*([^\)\n]*))?\)/g
  source.split(/\r?\n/).forEach(line => {
    paramPattern.lastIndex = 0
    while ((match = paramPattern.exec(line)) !== null) {
      if (line.slice(0, match.index).trim().startsWith('#')) continue
      const name = String(match[1] || '').trim()
      if (!name || seen.has(name) || isRuntimeReservedParam(name)) continue
      seen.add(name)
      const parsed = parsePythonLiteral(match[2])
      const type = inferParamType(name, parsed)
      params.push({ name, source: 'code_param', type, ...inferParamDefaults(name, parsed, type), ...parseParamKeywordOptions(match[3], type) })
    }
  })
  const strategyPattern = /^\s*#\s*@strategy\s+([A-Za-z_][\w-]*)\s*:?\s+([^\s#]+).*$/gim
  while ((match = strategyPattern.exec(source)) !== null) {
    const name = String(match[1] || '').trim()
    const schema = STRATEGY_ANNOTATION_SCHEMA[name]
    if (!name || !schema || seen.has(name)) continue
    seen.add(name)
    const parsed = parseStrategyAnnotationValue(name, match[2])
    params.push({ name, source: 'strategy_annotation', ...schema, default: parsed })
  }
  if (!params.length) {
    const indicatorPattern = /^\s*#\s*@param\s+(\w+)\s+(int|float|bool|str|string)\s+(\S+)\s*(.*)$/gim
    while ((match = indicatorPattern.exec(source)) !== null) {
      const name = String(match[1] || '').trim()
      if (!name || seen.has(name)) continue
      seen.add(name)
      const declaredType = String(match[2] || '').toLowerCase()
      const parsed = parsePythonLiteral(match[3])
      const type = declaredType === 'bool' ? 'boolean' : declaredType === 'int' ? 'integer' : declaredType === 'float' ? (isPercentParamName(name, parsed) ? 'percent' : 'number') : 'text'
      params.push({ name, source: 'indicator_param', type, ...inferParamDefaults(name, parsed, type), ...parseDeclaredRange(match[4], type) })
    }
  }
  return params.length ? { key: '__code_params__', inferred: true, params } : null
}

function toPythonLiteral(value) {
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '0'
  if (value === null || value === undefined) return 'None'
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export function buildScriptCodeWithParamValues(code, params = [], overrides = {}) {
  return (params || []).reduce((source, param) => {
    if (!param?.name) return source
    const stored = Object.prototype.hasOwnProperty.call(overrides, param.name) ? overrides[param.name] : param.default
    const literal = toPythonLiteral(stored)
    const escaped = escapeForRegExp(param.name)
    let next = source.replace(new RegExp(`(ctx\\.param\\(\\s*['"]${escaped}['"]\\s*,\\s*)([^\\)\\n]+)(\\))`), `$1${literal}$3`)
    const annotationLiteral = param.type === 'boolean' ? (stored ? 'true' : 'false') : String(stored)
    next = next.replace(new RegExp(`(^\\s*#\\s*@param\\s+${escaped}\\s+(?:int|float|bool|str|string)\\s+)(\\S+)(.*$)`, 'im'), `$1${annotationLiteral}$3`)
    next = next.replace(new RegExp(`(^\\s*#\\s*@strategy\\s+${escaped}\\s*:?\\s+)(\\S+)(.*$)`, 'im'), `$1${annotationLiteral}$3`)
    next = next.replace(new RegExp(`(params\\.get\\(\\s*['"]${escaped}['"]\\s*,\\s*)([^\\)\\n]+)(\\))`, 'g'), `$1${literal}$3`)
    return next.replace(new RegExp(`(context\\.params\\.get\\(\\s*['"]${escaped}['"]\\s*,\\s*)([^\\)\\n]+)(\\))`, 'g'), `$1${literal}$3`)
  }, String(code || ''))
}
