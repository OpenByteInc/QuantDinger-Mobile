<template>
  <van-popup
    :show="show"
    class="symbol-picker-popup"
    position="bottom"
    round
    @update:show="onUpdateShow"
    @close="$emit('close')"
  >
    <div class="picker-page">
      <div class="picker-head">
        <div>
          <span class="picker-title">{{ title || $t('watchlist.picker_title') }}</span>
          <small v-if="onlyCrypto">{{ $t('watchlist.crypto_only_hint') }}</small>
        </div>
        <button type="button" class="close-button" :aria-label="$t('common.close')" @click="onClose"><van-icon name="cross" /></button>
      </div>

      <div class="picker-tabs">
        <button
          type="button"
          :class="['tab', { active: mode === 'mine' }]"
          :aria-pressed="mode === 'mine'"
          @click="mode = 'mine'"
        ><van-icon name="star-o" />{{ $t('watchlist.my_list') }}</button>
        <button
          type="button"
          :class="['tab', { active: mode === 'search' }]"
          :aria-pressed="mode === 'search'"
          @click="mode = 'search'"
        ><van-icon name="search" />{{ $t('watchlist.search_add') }}</button>
      </div>

      <div v-if="mode === 'mine'" class="mine-wrap">
        <div v-if="loading" class="loading"><van-loading color="var(--v2-brand)" size="20" /></div>
        <template v-else>
          <div v-if="displayedList.length === 0" class="empty-block">
            <van-empty :description="$t('watchlist.empty_tip')" />
            <van-button round size="small" type="primary" @click="mode = 'search'">
              {{ $t('watchlist.search_add') }}
            </van-button>
          </div>
          <div v-else class="list">
            <div
              v-for="item in displayedList"
              :key="item.id || `${item.market}-${item.symbol}`"
              :class="['row', { selected: isSelected(item) }]"
              @click="pick(item)"
            >
              <div class="row-main">
                <div class="row-sym">{{ item.symbol }}</div>
                <div class="row-name">{{ item.name || item.symbol }}</div>
              </div>
              <div class="row-side">
                <span class="market-badge">{{ marketLabel(item.market) }}</span>
                <van-icon v-if="isSelected(item)" class="selected-icon" name="success" />
                <button
                  type="button"
                  class="del-icon"
                  :aria-label="$t('common.delete')"
                  @click.stop="handleRemove(item)"
                ><van-icon name="delete-o" /></button>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Search tab -->
      <div v-else class="search-wrap">
        <div v-if="!onlyCrypto" class="market-tabs">
          <span
            v-for="m in marketOptions"
            :key="m.value"
            :class="['mt-chip', { active: searchMarketInner === m.value }]"
            @click="onMarketTab(m.value)"
          >{{ m.label }}</span>
        </div>
        <van-search
          v-model="keyword"
          :placeholder="$t('watchlist.search_placeholder')"
          @update:model-value="debouncedSearch"
          @search="doSearch"
        />
        <div v-if="searching" class="loading"><van-loading color="var(--v2-brand)" size="20" /></div>
        <template v-else>
          <div v-if="!keyword" class="hot-wrap">
            <div class="hot-title">{{ $t('watchlist.hot_title') }}</div>
            <div class="hot-grid">
              <button
                type="button"
                v-for="h in hotList"
                :key="`${h.market || searchMarketInner}-${h.symbol}`"
                :class="['hot-item', { selected: isSelected(h) }]"
                @click="chooseResult(h)"
              ><strong>{{ displaySymbol(h) }}</strong><small>{{ h.name || marketLabel(h.market || searchMarketInner) }}</small><van-icon :name="isSelected(h) ? 'success' : 'arrow'" /></button>
            </div>
          </div>
          <div v-else-if="searchResults.length === 0" class="empty-block">
            <van-empty :description="$t('watchlist.search_empty')" />
          </div>
          <div v-else class="list">
            <div
              v-for="item in searchResults"
              :key="`${item.market}-${item.symbol}-${item.exchange_id || ''}-${item.market_type || ''}`"
              :class="['row', { selected: isSelected(item) }]"
              @click="chooseResult(item)"
            >
              <div class="row-main">
                <div class="row-sym">{{ item.symbol }}</div>
                <div class="row-name">{{ item.name || item.base || item.symbol }}</div>
              </div>
              <div class="row-side"><span class="market-badge">{{ marketLabel(item.market) }}</span><van-icon :name="isSelected(item) ? 'success' : 'arrow'" :class="isSelected(item) ? 'selected-icon' : 'row-arrow'" /></div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </van-popup>
</template>

<script>
import { showToast } from 'vant'
import { watchlistApi } from '@/api'
import { useWatchlistStore } from '@/stores'
import { isSupportedMarketSymbol } from '@/utils/tradeOrder'

export default {
  name: 'SymbolPicker',
  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: '' },
    onlyCrypto: { type: Boolean, default: false },
    autoAdd: { type: Boolean, default: true },
    defaultMarket: { type: String, default: 'Crypto' },
    searchMarket: { type: String, default: '' },
    exchangeId: { type: String, default: '' },
    marketType: { type: String, default: '' },
    selectedSymbol: { type: String, default: '' }
  },
  emits: ['update:show', 'pick', 'close'],
  data() {
    return {
      mode: 'mine',
      loading: false,
      searching: false,
      keyword: '',
      searchResults: [],
      hotList: [],
      searchTimer: null,
      searchMarketInner: this.defaultMarket || 'Crypto'
    }
  },
  computed: {
    marketOptions() {
      return [
        { value: 'Crypto', label: this.$t('watchlist.market_crypto') },
        { value: 'USStock', label: this.$t('watchlist.market_usstock') },
        { value: 'ChinaStock', label: this.$t('watchlist.market_chinastock') },
        { value: 'HKStock', label: this.$t('watchlist.market_hkstock') },
        { value: 'Forex', label: this.$t('watchlist.market_forex') },
        { value: 'Futures', label: this.$t('watchlist.market_futures') },
        { value: 'MOEX', label: this.$t('watchlist.market_moex') }
      ]
    },
    watchlistStore() {
      return useWatchlistStore()
    },
    displayedList() {
      const items = this.watchlistStore.items.filter(isSupportedMarketSymbol)
      if (this.onlyCrypto) {
        return items.filter((i) => (i.market || '').toLowerCase() === 'crypto')
      }
      return items
    }
  },
  watch: {
    show(val) {
      if (val) {
        this.mode = 'mine'
        this.keyword = ''
        this.searchResults = []
        this.searchMarketInner = this.searchMarket || this.defaultMarket || 'Crypto'
        this.load()
      }
    }
  },
  methods: {
    onUpdateShow(val) {
      this.$emit('update:show', val)
      if (!val) this.$emit('close')
    },
    onClose() {
      this.$emit('update:show', false)
      this.$emit('close')
    },
    async load() {
      this.loading = true
      try {
        const res = await watchlistApi.getList()
        this.watchlistStore.setItems(res.data || [])
        this.loadHot()
      } finally {
        this.loading = false
      }
    },
    async loadHot() {
      const market = this.onlyCrypto ? 'Crypto' : (this.defaultMarket || 'Crypto')
      try {
        const res = await watchlistApi.getHot({ market, limit: 8 })
        const items = (res.data || []).filter(isSupportedMarketSymbol)
        this.hotList = items.length ? items : this.watchlistFallback(market)
      } catch {
        this.hotList = this.watchlistFallback(market)
      }
    },
    debouncedSearch(kw) {
      clearTimeout(this.searchTimer)
      if (!kw || kw.trim().length < 1) {
        this.searchResults = []
        return
      }
      this.searchTimer = setTimeout(() => this.doSearch(kw), 300)
    },
    async doSearch(kw) {
      const keyword = String(kw || '').trim()
      if (!keyword) {
        this.searchResults = []
        return
      }
      this.searching = true
      try {
        const market = this.onlyCrypto ? 'Crypto' : this.searchMarketInner
        const res = await watchlistApi.search({
          market,
          keyword,
          limit: 30,
          exchange_id: market === 'Crypto' ? this.exchangeId : undefined,
          market_type: market === 'Crypto' ? this.marketType : undefined
        })
        this.searchResults = (res.data || []).filter(isSupportedMarketSymbol)
      } catch {
        this.searchResults = []
      } finally {
        this.searching = false
      }
    },
    onMarketTab(market) {
      this.searchMarketInner = market
      if (this.keyword && this.keyword.trim().length > 0) {
        this.doSearch(this.keyword)
      } else {
        this.loadHotForMarket(market)
      }
    },
    async loadHotForMarket(market) {
      try {
        const res = await watchlistApi.getHot({ market, limit: 8 })
        const items = (res.data || []).filter(isSupportedMarketSymbol)
        this.hotList = items.length ? items : this.watchlistFallback(market)
      } catch {
        this.hotList = this.watchlistFallback(market)
      }
    },
    async chooseResult(item) {
      if (!isSupportedMarketSymbol(item)) return
      const market = item.market || this.searchMarketInner || 'Crypto'
      const symbol = item.symbol
      const name = item.name || item.base || symbol
      const context = {
        exchange_id: item.exchange_id || (market === 'Crypto' ? this.exchangeId : ''),
        market_type: item.market_type || (market === 'Crypto' ? this.marketType : ''),
        instrument_id: item.instrument_id || '',
        settle_currency: item.settle_currency || '',
        product_type: item.product_type || '',
        api_family: item.api_family || '',
        underlying_market: item.underlying_market || '',
        underlying_symbol: item.underlying_symbol || '',
        product_meta: item.product_meta || null
      }
      if (!symbol) return
      if (this.autoAdd) {
        try {
          await watchlistApi.add({ market, symbol, name, ...context })
          await this.load()
        } catch (e) {
          showToast({ message: e?.message || this.$t('common.failed'), type: 'fail' })
          return
        }
      }
      this.$emit('pick', { market, symbol, name, ...context })
      this.$emit('update:show', false)
    },
    async pick(item) {
      if (!isSupportedMarketSymbol(item)) return
      let selected = item
      if (String(item?.market || '').toLowerCase() === 'crypto' && item?.exchange_id) {
        try {
          const res = await watchlistApi.search({
            market: 'Crypto',
            keyword: item.symbol,
            limit: 20,
            exchange_id: item.exchange_id,
            market_type: item.market_type || this.marketType
          })
          const exact = (res.data || []).find((candidate) => String(candidate.symbol || '').toUpperCase() === String(item.symbol || '').toUpperCase() && (!item.instrument_id || String(candidate.instrument_id || '').toUpperCase() === String(item.instrument_id).toUpperCase()))
          if (exact) selected = { ...item, ...exact }
        } catch {}
      }
      if (!isSupportedMarketSymbol(selected)) { showToast(this.$t('account_ui.unsupported')); return }
      this.$emit('pick', selected)
      this.$emit('update:show', false)
    },
    async handleRemove(item) {
      try {
        await watchlistApi.remove({ market: item.market, symbol: item.symbol })
        await this.load()
        showToast({ message: this.$t('watchlist.removed'), type: 'success' })
      } catch (e) {
        showToast({ message: e?.message || this.$t('common.failed'), type: 'fail' })
      }
    },
    displaySymbol(item) {
      return item?.symbol || item?.name || '-'
    },
    marketLabel(value) {
      return this.marketOptions.find((item) => item.value === value)?.label || value || ''
    },
    isSelected(item) {
      return Boolean(this.selectedSymbol) && String(item?.symbol || '').toUpperCase() === String(this.selectedSymbol).toUpperCase()
    },
    watchlistFallback(market) {
      return this.displayedList.filter((item) => item.market === market).slice(0, 8)
    }
  }
}
</script>

<style scoped>
.symbol-picker-popup {
  height: min(82vh, 760px);
  overflow: hidden;
  background: var(--v2-surface);
  color: var(--v2-text);
}
.picker-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--v2-surface);
  color: var(--v2-text);
}
.picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 58px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--v2-line);
}
.picker-head > div { display: flex; min-width: 0; flex-direction: column; gap: 2px; }
.picker-title { color: var(--v2-text); font-size: 16px; font-weight: 800; }
.picker-head small { color: var(--v2-muted); font-size: 10px; }
.close-button { width: 34px; height: 34px; display: grid; flex: 0 0 auto; place-items: center; border: 1px solid var(--v2-line); border-radius: 50%; background: var(--v2-surface-2); color: var(--v2-muted); font-size: 18px; }

.market-tabs {
  display: flex;
  gap: 7px;
  padding: 12px 16px 2px;
  overflow-x: auto;
  scrollbar-width: none;
}
.market-tabs::-webkit-scrollbar { display: none; }
.mt-chip {
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 999px;
  background: transparent;
  border: 1px solid var(--v2-line);
  color: var(--v2-muted);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.mt-chip.active {
  background: var(--v2-brand);
  color: var(--v2-on-brand);
  border-color: var(--v2-brand);
}

.picker-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  margin: 12px 16px 6px;
  padding: 3px;
  border-radius: 9px;
  background: var(--v2-surface-2);
}
.picker-tabs .tab {
  min-height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  font-size: 13px;
  font-weight: 700;
  color: var(--v2-muted);
}
.picker-tabs .tab.active {
  color: var(--v2-text);
  background: var(--v2-surface);
  box-shadow: 0 1px 5px color-mix(in srgb, var(--v2-text) 8%, transparent);
}

.mine-wrap,
.search-wrap {
  flex: 1;
  overflow-y: auto;
  padding-bottom: calc(12px + var(--safe-area-bottom, 0px));
}

.loading { padding: 40px; text-align: center; }

.empty-block {
  padding: 30px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.list { margin: 6px 16px 12px; overflow: hidden; border: 1px solid var(--v2-line); border-radius: 12px; background: var(--v2-bg); }
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 64px;
  gap: 12px;
  padding: 9px 12px;
  border-bottom: 1px solid var(--v2-line);
  background: transparent;
  cursor: pointer;
}
.row:last-child { border-bottom: 0; }
.row:active {
  background: var(--v2-surface-2);
}
.row.selected { background: color-mix(in srgb, var(--v2-brand) 9%, transparent); }
.row-main { flex: 1; min-width: 0; }
.row-sym { color: var(--v2-text); font-weight: 800; font-size: 14px; }
.row-name {
  color: var(--v2-muted);
  font-size: 11px;
  margin-top: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-side { display: flex; align-items: center; gap: 10px; }
.market-badge { max-width: 88px; overflow: hidden; padding: 3px 6px; border-radius: 4px; background: var(--v2-surface-2); color: var(--v2-muted); font-size: 9px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.selected-icon { color: var(--v2-brand-strong); font-size: 15px; }
.row-arrow { color: var(--v2-muted); font-size: 13px; }
.del-icon {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--v2-red);
  font-size: 16px;
}
.del-icon:active { background: color-mix(in srgb, var(--v2-red) 12%, transparent); }

.search-wrap :deep(.van-search) { background: transparent; padding: 10px 16px; }
.search-wrap :deep(.van-search__content) { min-height: 42px; padding: 0 12px; border: 1px solid var(--v2-line); border-radius: 9px; background: var(--v2-bg); }
.search-wrap :deep(.van-field__control) { color: var(--v2-text); }
.search-wrap :deep(.van-field__left-icon), .search-wrap :deep(.van-field__control::placeholder) { color: var(--v2-muted); }

.hot-wrap { padding: 8px 16px 20px; }
.hot-title {
  font-size: 12px;
  color: var(--v2-muted);
  margin: 3px 0 10px;
}
.hot-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.hot-item { position: relative; min-width: 0; min-height: 58px; display: flex; flex-direction: column; align-items: flex-start; justify-content: center; padding: 9px 32px 9px 11px; border: 1px solid var(--v2-line); border-radius: 10px; background: var(--v2-bg); color: var(--v2-text); text-align: left; }
.hot-item strong { max-width: 100%; overflow: hidden; font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.hot-item small { width: 100%; overflow: hidden; margin-top: 3px; color: var(--v2-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.hot-item .van-icon { position: absolute; right: 11px; color: var(--v2-muted); font-size: 12px; }
.hot-item.selected { border-color: color-mix(in srgb, var(--v2-brand) 42%, var(--v2-line)); background: color-mix(in srgb, var(--v2-brand) 9%, var(--v2-bg)); }
.hot-item.selected .van-icon { color: var(--v2-brand-strong); }
.empty-block :deep(.van-empty__description) { color: var(--v2-muted); }
.empty-block :deep(.van-button--primary) { border-color: var(--v2-brand); background: var(--v2-brand); color: var(--v2-on-brand); }
</style>
