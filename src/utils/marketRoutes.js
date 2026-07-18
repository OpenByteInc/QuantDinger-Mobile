export const ASSET_TYPES = {
  INDICATOR: 'indicator',
  SCRIPT_TEMPLATE: 'script_template'
}

export const normalizeAssetType = (value) => {
  const type = String(value || '').trim().toLowerCase()
  if (type === ASSET_TYPES.SCRIPT_TEMPLATE) return type
  return ASSET_TYPES.INDICATOR
}

export const getPurchaseIndicator = (item = {}) => item.indicator || item

export const getAssetType = (item = {}) => {
  const indicator = getPurchaseIndicator(item)
  return normalizeAssetType(item.asset_type || indicator.asset_type)
}

export const getAssetLabel = (type, t) => {
  const labels = {
    [ASSET_TYPES.INDICATOR]: t ? t('market.asset_indicator') : 'Indicator',
    [ASSET_TYPES.SCRIPT_TEMPLATE]: t ? t('market.asset_script_template') : 'Trading Script'
  }
  return labels[normalizeAssetType(type)]
}

export const isStrategyAsset = (item = {}) => (
  getAssetType(typeof item === 'string' ? { asset_type: item } : item) === ASSET_TYPES.SCRIPT_TEMPLATE
)

export const buildCreateRouteFromMarketAsset = (item = {}) => {
  const indicator = getPurchaseIndicator(item)
  if (!isStrategyAsset(item)) return null

  const name = indicator.name || item.name || ''
  const scriptSourceId =
    item.script_source_id ||
    item.purchased_script_source_id ||
    indicator.script_source_id ||
    indicator.purchased_script_source_id
  return {
    path: '/trading/create/script',
    query: {
      source_id: scriptSourceId || '',
      name
    }
  }
}
