export function watchlistAssetKey(item = {}) {
  const hk = String(item.symbol || '').trim().toUpperCase().match(/^(?:HKSTOCK:)?(?:HK\.?)?(\d{1,5})(?:\.HK)?$/)
  if (item.market === 'HKStock' && hk) return `HKStock:${hk[1].padStart(5, '0')}:${item.product_type || 'hkstock'}`
  const assetId = Number(item.asset_id || item.assetId || 0)
  if (assetId > 0) return `asset:${assetId}`
  const market = String(item.market || '')
  const symbol = String(item.symbol || '').trim().toUpperCase()
  const product = String(item.product_type || '').toLowerCase()
  return JSON.stringify([market, symbol, product, item.underlying_market || '', item.underlying_symbol || ''])
}

export function groupWatchlistAssets(rows = []) {
  const groups = new Map()
  for (const item of rows) {
    if (!item?.market || !item?.symbol) continue
    const key = watchlistAssetKey(item)
    if (!groups.has(key)) groups.set(key, { key, item, items: [] })
    groups.get(key).items.push(item)
  }
  return [...groups.values()]
}

export function watchlistPayload(item = {}) {
  return { asset_id: Number(item.asset_id || item.assetId || 0) }
}
