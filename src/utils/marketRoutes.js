export const ASSET_TYPES = {
  INDICATOR: 'indicator',
  SCRIPT_TEMPLATE: 'script_template',
  BOT_PRESET: 'bot_preset'
}

export const normalizeAssetType = (value) => {
  const type = String(value || '').trim().toLowerCase()
  if (type === ASSET_TYPES.SCRIPT_TEMPLATE || type === ASSET_TYPES.BOT_PRESET) return type
  return ASSET_TYPES.INDICATOR
}

export const getPurchaseIndicator = (item = {}) => item.indicator || item

export const getAssetType = (item = {}) => {
  const indicator = getPurchaseIndicator(item)
  return normalizeAssetType(item.asset_type || indicator.asset_type)
}

export const getAssetLabel = (type, t) => {
  const labels = {
    [ASSET_TYPES.INDICATOR]: t ? t('market.asset_indicator') : 'Indicator Strategy',
    [ASSET_TYPES.SCRIPT_TEMPLATE]: t ? t('market.asset_script_template') : 'Trading Script',
    [ASSET_TYPES.BOT_PRESET]: t ? t('market.asset_bot_preset') : 'Strategy Template'
  }
  return labels[normalizeAssetType(type)]
}

export const getUseLabel = (type, t) => {
  const labels = {
    [ASSET_TYPES.INDICATOR]: t ? t('market.use_indicator') : 'Create Strategy',
    [ASSET_TYPES.SCRIPT_TEMPLATE]: t ? t('market.use_script_template') : 'Configure Trading Script',
    [ASSET_TYPES.BOT_PRESET]: t ? t('market.use_bot_preset') : 'Configure Template'
  }
  return labels[normalizeAssetType(type)]
}

export const buildCreateRouteFromMarketAsset = (item = {}, fallbackId = null) => {
  const indicator = getPurchaseIndicator(item)
  const assetType = getAssetType(item)
  const sourceId = indicator.id || fallbackId || item.indicator_id
  const name = indicator.name || item.name || ''

  if (assetType === ASSET_TYPES.SCRIPT_TEMPLATE) {
    const scriptSourceId =
      item.script_source_id ||
      item.purchased_script_source_id ||
      indicator.script_source_id ||
      indicator.purchased_script_source_id
    return {
      path: '/trading/create/script',
      query: {
        source_id: scriptSourceId || '',
        source_indicator_id: sourceId || '',
        name
      }
    }
  }

  if (assetType === ASSET_TYPES.BOT_PRESET) {
    const presetStrategyId =
      item.purchased_strategy_id ||
      item.strategy_id ||
      indicator.purchased_strategy_id ||
      indicator.strategy_id
    return {
      path: '/trading/create/manual',
      query: {
        preset_strategy_id: presetStrategyId || '',
        source_indicator_id: sourceId || '',
        name
      }
    }
  }

  const localId =
    item.local_copy_id ||
    item.local_indicator_id ||
    item.buyer_indicator_id ||
    indicator.local_copy_id ||
    indicator.local_indicator_id ||
    indicator.buyer_indicator_id
  return {
    path: '/trading/create/indicator',
    query: {
      indicator_id: localId || '',
      source_indicator_id: sourceId || '',
      name
    }
  }
}
