<template>
  <van-popup
    :show="show"
    position="bottom"
    round
    :style="{ height: '86%' }"
    @update:show="onUpdateShow"
    @close="$emit('close')"
  >
    <div class="picker-page">
      <div class="picker-head">
        <span class="picker-title">{{ title || $t('watchlist.picker_title') }}</span>
        <van-icon name="cross" @click="onClose" />
      </div>

      <div class="picker-tabs">
        <span
          :class="['tab', { active: mode === 'mine' }]"
          @click="mode = 'mine'"
        >{{ $t('watchlist.my_list') }}</span>
        <span
          :class="['tab', { active: mode === 'search' }]"
          @click="mode = 'search'"
        >{{ $t('watchlist.search_add') }}</span>
      </div>

      <!-- My watchlist -->
      <div v-if="mode === 'mine'" class="mine-wrap">
        <div v-if="onlyCrypto" class="hint">{{ $t('watchlist.crypto_only_hint') }}</div>
        <div v-if="loading" class="loading"><van-loading color="#7c5cff" size="20" /></div>
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
              class="row"
              @click="pick(item)"
            >
              <div class="row-main">
                <div class="row-sym">{{ item.symbol }}</div>
                <div class="row-name">{{ item.name || item.symbol }}</div>
              </div>
              <div class="row-side">
                <van-tag plain type="primary" size="mini">{{ item.market }}</van-tag>
                <van-icon
                  class="del-icon"
                  name="delete-o"
                  @click.stop="handleRemove(item)"
                />
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
          shape="round"
          :placeholder="$t('watchlist.search_placeholder')"
          @update:model-value="debouncedSearch"
          @search="doSearch"
        />
        <div v-if="searching" class="loading"><van-loading color="#7c5cff" size="20" /></div>
        <template v-else>
          <div v-if="!keyword" class="hot-wrap">
            <div class="hot-title">{{ $t('watchlist.hot_title') }}</div>
            <div class="hot-chips">
              <span
                v-for="h in hotList"
                :key="h.symbol"
                class="hot-chip"
                @click="chooseResult(h)"
              >{{ displaySymbol(h) }}</span>
            </div>
          </div>
          <div v-else-if="searchResults.length === 0" class="empty-block">
            <van-empty :description="$t('watchlist.search_empty')" />
          </div>
          <div v-else class="list">
            <div
              v-for="item in searchResults"
              :key="`${item.market}-${item.symbol}-${item.exchange_id || ''}-${item.market_type || ''}`"
              class="row"
              @click="chooseResult(item)"
            >
              <div class="row-main">
                <div class="row-sym">{{ item.symbol }}</div>
                <div class="row-name">{{ item.name || item.base || item.symbol }}</div>
              </div>
              <van-tag plain type="primary" size="mini">{{ item.market }}</van-tag>
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
    marketType: { type: String, default: '' }
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
      const items = this.watchlistStore.items
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
      try {
        const market = this.onlyCrypto ? 'Crypto' : (this.defaultMarket || 'Crypto')
        const res = await watchlistApi.getHot({ market, limit: 8 })
        this.hotList = res.data || []
      } catch {
        this.hotList = []
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
        this.searchResults = res.data || []
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
        this.hotList = res.data || []
      } catch {
        this.hotList = []
      }
    },
    async chooseResult(item) {
      const market = item.market || this.searchMarketInner || 'Crypto'
      const symbol = item.symbol
      const name = item.name || item.base || symbol
      const context = {
        exchange_id: item.exchange_id || (market === 'Crypto' ? this.exchangeId : ''),
        market_type: item.market_type || (market === 'Crypto' ? this.marketType : ''),
        instrument_id: item.instrument_id || '',
        settle_currency: item.settle_currency || ''
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
    pick(item) {
      this.$emit('pick', item)
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
    }
  }
}
</script>

<style scoped>
.picker-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-elevated);
  color: var(--text);
}
.picker-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 18px;
  border-bottom: 1px solid var(--hairline);
}
.picker-head .van-icon { color: var(--text-2); font-size: 18px; }
.picker-title { font-size: 16px; font-weight: 700; color: var(--text); }

.market-tabs {
  display: flex;
  gap: 6px;
  padding: 8px 14px 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.market-tabs::-webkit-scrollbar { display: none; }
.mt-chip {
  flex-shrink: 0;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.mt-chip.active {
  background: var(--accent);
  color: var(--text-on-accent);
  border-color: transparent;
}

.picker-tabs {
  display: flex;
  padding: 8px 14px 4px;
  gap: 8px;
}
.picker-tabs .tab {
  flex: 1;
  text-align: center;
  padding: 10px 0;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-3);
  background: var(--surface-raised);
  border: 1px solid var(--border);
}
.picker-tabs .tab.active {
  color: var(--text-on-accent);
  background: var(--accent);
  border-color: transparent;
}

.hint {
  padding: 6px 18px 4px;
  font-size: 11px;
  color: var(--text-3);
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

.list { padding: 4px 16px 12px; }
.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 14px;
  border-radius: 14px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  margin-bottom: 8px;
  cursor: pointer;
}
.row:active {
  background: var(--accent-soft);
  border-color: var(--accent);
}
.row-main { flex: 1; min-width: 0; }
.row-sym { color: var(--text); font-weight: 700; font-size: 14px; }
.row-name {
  color: var(--text-3);
  font-size: 11px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row-side { display: flex; align-items: center; gap: 10px; }
.del-icon {
  font-size: 18px;
  color: var(--down);
  padding: 4px;
}

.search-wrap :deep(.van-search) { background: transparent; padding: 10px 14px; }
.search-wrap :deep(.van-search__content) { background: var(--surface-raised); }
.search-wrap :deep(.van-field__control) { color: var(--text); }

.hot-wrap { padding: 8px 18px 20px; }
.hot-title {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 10px;
}
.hot-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.hot-chip {
  padding: 8px 14px;
  border-radius: 999px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-2);
  cursor: pointer;
}
</style>
