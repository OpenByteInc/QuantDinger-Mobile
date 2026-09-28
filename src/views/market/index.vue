<template>
  <div :class="['market-page', isStrategyAsset ? 'strategy-market' : 'indicator-market']">
    <van-nav-bar fixed placeholder safe-area-inset-top :title="$t('market.title')" left-arrow @click-left="$router.back()">
      <template #right>
        <button type="button" class="purchases-link" @click="$router.push('/market/my-purchases')">
          <van-icon name="bag-o" />
          <span>{{ $t('market.purchased_short') }}</span>
        </button>
      </template>
    </van-nav-bar>

    <main>
      <section class="market-controls" :aria-label="$t('market.asset_type_label')">
        <div class="asset-tabs" role="tablist" :aria-label="$t('market.asset_type_label')">
          <button
            v-for="opt in assetOptions"
            :key="opt.value"
            type="button"
            role="tab"
            :aria-selected="assetType === opt.value"
            :class="['asset-tab', { active: assetType === opt.value }]"
            @click="setAssetType(opt.value)"
          >
            <van-icon :name="opt.icon" />
            <span>{{ opt.label }}</span>
            <strong>{{ opt.count }}</strong>
          </button>
        </div>

        <van-search
          v-model="keyword"
          shape="round"
          :placeholder="$t(isStrategyAsset ? 'market.search_script_placeholder' : 'market.search_indicator_placeholder')"
          @search="reload"
          @clear="reload"
        />

        <div v-if="isStrategyAsset" class="filter-rail" role="group" :aria-label="$t('market.strategy_filters')">
          <button
            v-for="control in strategyToolbarFilters"
            :key="control.key"
            type="button"
            :class="['filter-chip', { active: control.active }]"
            @click="openStrategyFilters(control.key)"
          >
            <span>{{ control.label }}</span>
            <van-icon name="arrow-down" />
          </button>
          <button type="button" :class="['filter-chip', { active: !!pricing }]" @click="showPricingPicker = true">
            <span>{{ pricingLabel }}</span>
            <van-icon name="arrow-down" />
          </button>
          <button type="button" class="filter-chip sort" @click="showSortPicker = true">
            <van-icon name="sort" />
            <span>{{ sortLabel }}</span>
          </button>
          <button
            type="button"
            :class="['filter-chip', 'filter-more', { active: activeStrategyFilterCount > visibleStrategyFilterCount }]"
            :aria-label="$t('market.strategy_filters')"
            @click="openStrategyFilters()"
          >
            <van-icon name="filter-o" />
            <b v-if="activeStrategyFilterCount">{{ activeStrategyFilterCount }}</b>
          </button>
        </div>

        <div v-else class="filter-rail indicator-filter-rail" role="group" :aria-label="$t('market.indicator_filters')">
          <button type="button" class="filter-chip sort active" @click="showSortPicker = true">
            <van-icon name="sort" />
            <span>{{ sortLabel }}</span>
            <van-icon name="arrow-down" />
          </button>
          <button type="button" :class="['filter-chip', { active: !!codeVisibility }]" @click="showCodePicker = true">
            <span>{{ codeVisibilityLabel }}</span>
            <van-icon name="arrow-down" />
          </button>
          <button type="button" :class="['filter-chip', { active: !!pricing }]" @click="showPricingPicker = true">
            <span>{{ pricingLabel }}</span>
            <van-icon name="arrow-down" />
          </button>
        </div>
      </section>

      <div class="market-feed">
        <section v-if="isStrategyAsset && items.length" class="strategy-results">
          <header class="section-heading strategy-heading">
            <div>
              <strong>{{ $t('market.strategy_results', { count: total }) }}</strong>
              <small>{{ $t('market.strategy_results_hint') }}</small>
            </div>
            <div class="quick-sort" role="group" :aria-label="$t('market.sort_label')">
              <button
                v-for="option in strategyQuickSorts"
                :key="option.value"
                type="button"
                :class="{ active: sort === option.value }"
                @click="setSort(option.value)"
              >{{ option.label }}</button>
            </div>
          </header>

          <div class="strategy-list">
            <article
              v-for="item in items"
              :key="item.id"
              class="strategy-row"
              tabindex="0"
              @click="openDetail(item)"
              @keyup.enter="openDetail(item)"
            >
              <div class="strategy-score" :class="scoreClass(item)">
                <strong>{{ hasBacktest(item) ? formatScore(item.score) : '—' }}</strong>
                <span>{{ $t('market.score_short') }}</span>
              </div>
              <div class="strategy-main">
                <div class="strategy-title-line">
                  <h2>{{ item.name }}</h2>
                  <span v-if="hasBacktest(item)" class="tested-badge"><van-icon name="passed" /> {{ $t('market.backtested') }}</span>
                </div>
                <div class="strategy-meta">
                  <span v-for="tag in strategyMeta(item)" :key="tag">{{ tag }}</span>
                  <span v-if="hasBacktest(item)">{{ $t('market.sample_count', { count: asNumber(item.sample_size) }) }}</span>
                </div>
                <p v-if="item.description" class="strategy-desc">{{ shortDesc(item.description, 68) }}</p>
              </div>
              <div class="strategy-price">
                <div class="price-copy">
                  <span :class="isPaidItem(item) ? 'paid' : 'free'">{{ priceText(item) }}</span>
                  <em v-if="item.vip_free">{{ $t('market.vip_free') }}</em>
                </div>
                <van-icon name="arrow" />
              </div>
              <div class="strategy-metrics">
                <div v-for="metric in strategyMetrics(item)" :key="metric.key">
                  <span>{{ metric.label }}</span>
                  <strong :class="metric.tone">{{ metric.value }}</strong>
                </div>
              </div>
            </article>
          </div>
        </section>

        <template v-else-if="items.length">
          <section class="indicator-results">
            <header class="section-heading">
              <strong>{{ $t('market.indicator_results', { count: total }) }}</strong>
              <button type="button" @click="showSortPicker = true"><van-icon name="sort" /> {{ sortLabel }}</button>
            </header>
            <div class="indicator-grid">
              <article
                v-for="item in indicatorCatalogItems"
                :key="item.id"
                :class="['indicator-card', { 'has-preview': indicatorHasPreview(item), 'no-preview': !indicatorHasPreview(item) }]"
                tabindex="0"
                @click="openDetail(item)"
                @keyup.enter="openDetail(item)"
              >
                <div v-if="indicatorHasPreview(item)" class="indicator-preview">
                  <img
                    :src="item.preview_image"
                    :alt="item.name"
                    @error="markImageError(item.id)"
                  />
                  <span :class="['visibility-badge', visibilityTone(item)]">{{ visibilityLabel(item) }}</span>
                </div>
                <div class="indicator-body">
                  <div class="indicator-card-title">
                    <span v-if="!indicatorHasPreview(item)" class="indicator-mark compact"><van-icon name="bar-chart-o" /></span>
                    <div>
                      <h2>{{ item.name }}</h2>
                      <p class="author-line">{{ authorName(item) }}</p>
                    </div>
                    <span v-if="!indicatorHasPreview(item)" :class="['visibility-badge', 'inline', visibilityTone(item)]">{{ visibilityLabel(item) }}</span>
                  </div>
                  <p class="indicator-description">{{ indicatorDescription(item) }}</p>
                  <div v-if="indicatorScope(item, 2).length" class="indicator-tags compact">
                    <span v-for="tag in indicatorScope(item, 2)" :key="tag">{{ tag }}</span>
                  </div>
                  <div class="indicator-card-footer">
                    <span><van-icon name="star" /> {{ formatRating(item.avg_rating) }}</span>
                    <span><van-icon name="friends-o" /> {{ compactNumber(item.purchase_count) }}</span>
                    <div class="indicator-price">
                      <strong :class="isPaidItem(item) ? 'paid' : 'free'">{{ priceText(item) }}</strong>
                      <em v-if="item.vip_free">{{ $t('market.vip_free') }}</em>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </template>
      </div>

      <nav v-if="!loading && items.length && pageCount > 1" class="market-pagination" :aria-label="$t('market.pagination')">
        <button type="button" :disabled="page <= 1" @click="goPage(page - 1)">
          <van-icon name="arrow-left" />
          <span>{{ $t('market.previous_page') }}</span>
        </button>
        <span class="page-status">
          <strong>{{ page }}</strong>
          <em>/ {{ pageCount }}</em>
        </span>
        <button type="button" :disabled="page >= pageCount" @click="goPage(page + 1)">
          <span>{{ $t('market.next_page') }}</span>
          <van-icon name="arrow" />
        </button>
      </nav>

      <div v-if="loading" class="market-loading" role="status">
        <van-loading size="18" />
        <span>{{ $t('common.loading') }}</span>
      </div>

      <div v-if="!loading && !items.length" class="market-empty" role="status">
        <van-icon :name="loadFailed ? 'warning-o' : 'bag-o'" class="empty-icon" />
        <strong>{{ emptyStateTitle }}</strong>
        <p>{{ emptyStateDescription }}</p>
        <div class="empty-actions">
          <van-button round type="primary" size="small" @click="reload">{{ $t('common.refresh') }}</van-button>
          <van-button v-if="hasActiveFilters" round plain size="small" @click="clearFilters">{{ $t('market.clear_filters') }}</van-button>
          <van-button v-else round plain size="small" @click="$router.push('/trading')">{{ $t('market.view_my_strategies') }}</van-button>
        </div>
      </div>
    </main>

    <van-popup v-model:show="showSortPicker" position="bottom" round teleport="body">
      <van-picker :columns="sortColumns" @cancel="showSortPicker = false" @confirm="onSortSelect" />
    </van-popup>
    <van-popup v-model:show="showPricingPicker" position="bottom" round teleport="body">
      <van-picker :columns="pricingColumns" @cancel="showPricingPicker = false" @confirm="onPricingSelect" />
    </van-popup>
    <van-popup v-model:show="showCodePicker" position="bottom" round teleport="body">
      <van-picker :columns="codeVisibilityColumns" @cancel="showCodePicker = false" @confirm="onCodeSelect" />
    </van-popup>
    <van-popup v-model:show="showStrategyFilters" position="bottom" round class="strategy-filter-popup" teleport="body">
      <div class="filter-sheet">
        <div class="filter-sheet-head">
          <strong>{{ $t('market.strategy_filters') }}</strong>
          <button type="button" @click="resetDraftStrategyFilters">{{ $t('market.reset_filters') }}</button>
        </div>
        <div v-for="group in strategyFilterGroups" :key="group.key" :class="['filter-group', { focused: focusedFilterGroup === group.key }]">
          <label>{{ group.label }}</label>
          <div class="filter-chips">
            <button
              v-for="option in group.options"
              :key="option.value || 'all'"
              type="button"
              :class="{ active: draftStrategyFilters[group.key] === option.value }"
              @click="draftStrategyFilters[group.key] = option.value"
            >{{ option.label }}</button>
          </div>
        </div>
        <div class="filter-sheet-actions">
          <van-button block round plain @click="showStrategyFilters = false">{{ $t('common.cancel') }}</van-button>
          <van-button block round type="primary" @click="applyStrategyFilters">{{ $t('market.apply_filters') }}</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script>
import { marketApi } from '@/api'
import { ASSET_TYPES, isStrategyAsset, normalizeAssetType } from '@/utils/marketRoutes'

export default {
  name: 'Market',
  data() {
    return {
      items: [], keyword: '', pricing: '', codeVisibility: '',
      assetType: ASSET_TYPES.SCRIPT_TEMPLATE,
      assetCounts: { indicator: 0, script_template: 0 },
      sort: 'score', page: 1, pageSize: 10, total: 0, totalPages: 0,
      loading: false, loadFailed: false,
      showSortPicker: false, showPricingPicker: false, showCodePicker: false,
      showStrategyFilters: false, focusedFilterGroup: '',
      strategyFilters: this.emptyStrategyFilters(),
      draftStrategyFilters: this.emptyStrategyFilters(),
      imageErrors: {}
    }
  },
  computed: {
    assetOptions() {
      return [
        { value: ASSET_TYPES.INDICATOR, label: this.$t('market.asset_indicator'), icon: 'bar-chart-o', count: this.assetCounts.indicator },
        { value: ASSET_TYPES.SCRIPT_TEMPLATE, label: this.$t('market.asset_script_template'), icon: 'description', count: this.assetCounts.script_template }
      ]
    },
    isStrategyAsset() { return this.assetType === ASSET_TYPES.SCRIPT_TEMPLATE },
    indicatorCatalogItems() { return this.isStrategyAsset ? [] : this.items },
    pageCount() { return Math.max(1, this.totalPages || Math.ceil(this.total / this.pageSize)) },
    strategyQuickSorts() {
      return [
        { value: 'score', label: this.$t('market.sort_score_short') },
        { value: 'hot', label: this.$t('market.sort_hot') },
        { value: 'newest', label: this.$t('market.sort_newest') }
      ]
    },
    sortColumns() {
      const common = [
        { value: 'newest', text: this.$t('market.sort_newest') },
        { value: 'hot', text: this.$t('market.sort_hot') },
        { value: 'rating', text: this.$t('market.sort_rating') },
        { value: 'price_asc', text: this.$t('market.sort_price_asc') },
        { value: 'price_desc', text: this.$t('market.sort_price_desc') }
      ]
      return this.isStrategyAsset ? [{ value: 'score', text: this.$t('market.sort_score') }, ...common] : common
    },
    sortLabel() {
      return this.sortColumns.find((entry) => entry.value === this.sort)?.text || this.$t('market.sort_hot')
    },
    pricingColumns() {
      return [
        { value: '', text: this.$t('market.filter_all_prices') },
        { value: 'free', text: this.$t('market.filter_free') },
        { value: 'paid', text: this.$t('market.filter_paid') },
        { value: 'vip_free', text: this.$t('market.filter_vip_free') }
      ]
    },
    pricingLabel() {
      return this.pricing ? this.pricingColumns.find((entry) => entry.value === this.pricing)?.text : this.$t('market.filter_price')
    },
    codeVisibilityColumns() {
      return [
        { value: '', text: this.$t('market.filter_all_code') },
        { value: 'visible', text: this.$t('market.code_visible') },
        { value: 'hidden', text: this.$t('market.code_hidden') }
      ]
    },
    codeVisibilityLabel() {
      return this.codeVisibility ? this.codeVisibilityColumns.find((entry) => entry.value === this.codeVisibility)?.text : this.$t('market.filter_code')
    },
    activeStrategyFilterCount() { return Object.values(this.strategyFilters).filter(Boolean).length },
    visibleStrategyFilterCount() { return ['market', 'market_type', 'direction_mode'].filter((key) => this.strategyFilters[key]).length },
    strategyToolbarFilters() {
      return [
        { key: 'market', label: this.strategyFilterLabel('market', this.$t('market.filter_market')), active: !!this.strategyFilters.market },
        { key: 'market_type', label: this.strategyFilterLabel('market_type', this.$t('market.filter_market_type')), active: !!this.strategyFilters.market_type },
        { key: 'direction_mode', label: this.strategyFilterLabel('direction_mode', this.$t('market.filter_direction')), active: !!this.strategyFilters.direction_mode }
      ]
    },
    strategyFilterGroups() {
      return [
        { key: 'market', label: this.$t('market.filter_market'), options: this.filterChoices('market', ['usstock', 'crypto', 'cnstock', 'hkstock']) },
        { key: 'market_type', label: this.$t('market.filter_market_type'), options: this.filterChoices('market_type', ['spot', 'swap']) },
        { key: 'binding_mode', label: this.$t('market.filter_binding'), options: this.filterChoices('binding', ['parameterized', 'fixed', 'portfolio', 'universe']) },
        { key: 'strategy_type', label: this.$t('market.filter_strategy_type'), options: this.filterChoices('strategy_type', ['cta', 'portfolio']) },
        { key: 'direction_mode', label: this.$t('market.filter_direction'), options: this.filterChoices('direction', ['long_only', 'short_only', 'both', 'neutral']) },
        { key: 'leverage', label: this.$t('market.filter_leverage'), options: this.filterChoices('leverage', ['no', 'yes']) }
      ]
    },
    hasActiveFilters() { return !!(this.keyword || this.pricing || this.codeVisibility || this.activeStrategyFilterCount) },
    emptyStateTitle() {
      if (this.loadFailed) return this.$t('market.empty_load_title')
      if (this.hasActiveFilters) return this.$t('market.empty_filter_title')
      return this.$t(this.isStrategyAsset ? 'market.empty_strategy_title' : 'market.empty_indicator_title')
    },
    emptyStateDescription() {
      if (this.loadFailed) return this.$t('market.empty_load_desc')
      if (this.hasActiveFilters) return this.$t('market.empty_filter_desc')
      return this.$t(this.isStrategyAsset ? 'market.empty_strategy_desc' : 'market.empty_indicator_desc')
    }
  },
  mounted() {
    if (this.$route.query?.asset_type) this.assetType = normalizeAssetType(this.$route.query.asset_type)
    this.sort = this.defaultSortFor(this.assetType)
    this.reload()
  },
  methods: {
    defaultSortFor(assetType) { return assetType === ASSET_TYPES.INDICATOR ? 'hot' : 'score' },
    async reload() {
      this.page = 1; this.totalPages = 0; this.items = []; this.imageErrors = {}; this.loadFailed = false
      await this.loadPage()
    },
    async loadPage() {
      if (this.loading) return
      this.loading = true
      try {
        const res = await marketApi.getIndicators({
          page: this.page, page_size: this.pageSize, keyword: this.keyword || undefined,
          pricing_type: this.pricing === 'vip_free' ? undefined : (this.pricing || undefined),
          vip_free: this.pricing === 'vip_free' ? 1 : undefined,
          code_visibility: !this.isStrategyAsset && this.codeVisibility ? this.codeVisibility : undefined,
          asset_type: this.assetType, sort_by: this.sort,
          ...(this.isStrategyAsset ? this.strategyFilters : {})
        })
        const data = res.data || {}
        const list = data.items || []
        this.items = list
        this.total = Number(data.total || this.items.length)
        this.totalPages = Number(data.total_pages || Math.ceil(this.total / this.pageSize))
        const counts = data.asset_type_counts || {}
        this.assetCounts = {
          indicator: Number.isFinite(Number(counts.indicator))
            ? Number(counts.indicator)
            : (this.assetType === ASSET_TYPES.INDICATOR ? this.total : this.assetCounts.indicator),
          script_template: Number.isFinite(Number(counts.script_template))
            ? Number(counts.script_template)
            : (this.assetType === ASSET_TYPES.SCRIPT_TEMPLATE ? this.total : this.assetCounts.script_template)
        }
      } catch (err) {
        this.loadFailed = true
      } finally { this.loading = false }
    },
    async goPage(nextPage) {
      const target = Math.min(this.pageCount, Math.max(1, Number(nextPage) || 1))
      if (target === this.page || this.loading) return
      this.page = target; this.items = []; this.imageErrors = {}; this.loadFailed = false
      await this.loadPage()
      this.$nextTick(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    },
    setAssetType(value) {
      const next = normalizeAssetType(value)
      if (this.assetType === next) return
      this.assetType = next; this.sort = this.defaultSortFor(next); this.codeVisibility = ''
      if (next !== ASSET_TYPES.SCRIPT_TEMPLATE) {
        this.strategyFilters = this.emptyStrategyFilters(); this.draftStrategyFilters = this.emptyStrategyFilters()
      }
      this.$router.replace({ path: '/market/all', query: { ...this.$route.query, asset_type: next } })
      this.reload()
    },
    setSort(value) { if (this.sort !== value) { this.sort = value; this.reload() } },
    onSortSelect(payload) { const selected = this.selectedPickerOption(payload); if (selected) this.sort = selected.value; this.showSortPicker = false; this.reload() },
    onPricingSelect(payload) { const selected = this.selectedPickerOption(payload); if (selected) this.pricing = selected.value; this.showPricingPicker = false; this.reload() },
    onCodeSelect(payload) { const selected = this.selectedPickerOption(payload); if (selected) this.codeVisibility = selected.value; this.showCodePicker = false; this.reload() },
    selectedPickerOption(payload) { return payload?.selectedOptions?.[0] || payload?.[0] || null },
    clearFilters() {
      this.keyword = ''; this.pricing = ''; this.codeVisibility = ''
      this.strategyFilters = this.emptyStrategyFilters(); this.draftStrategyFilters = this.emptyStrategyFilters()
      this.sort = this.defaultSortFor(this.assetType); this.reload()
    },
    openDetail(item) { this.$router.push(`/market/indicator/${item.id}`) },
    openStrategyFilters(group = '') { this.focusedFilterGroup = group; this.draftStrategyFilters = { ...this.strategyFilters }; this.showStrategyFilters = true },
    resetDraftStrategyFilters() { this.draftStrategyFilters = this.emptyStrategyFilters() },
    applyStrategyFilters() { this.strategyFilters = { ...this.draftStrategyFilters }; this.showStrategyFilters = false; this.reload() },
    emptyStrategyFilters() { return { market: '', market_type: '', binding_mode: '', strategy_type: '', direction_mode: '', leverage: '' } },
    filterChoices(group, values) {
      return [{ value: '', label: this.$t('market.filter_all') }, ...values.map((value) => ({ value, label: this.$t(`market.filter_${group}_${value}`) }))]
    },
    strategyFilterLabel(key, fallback) {
      const value = this.strategyFilters[key]
      if (!value) return fallback
      const group = this.strategyFilterGroups.find((entry) => entry.key === key)
      return group?.options.find((entry) => entry.value === value)?.label || fallback
    },
    isStrategyItem(item) { return isStrategyAsset(item) },
    hasBacktest(item) { return this.isStrategyItem(item) && this.asNumber(item.sample_size) > 0 },
    asNumber(value) { const number = Number(value); return Number.isFinite(number) ? number : 0 },
    formatScore(value) { return Math.round(this.asNumber(value)) },
    formatPercent(value, signed = false) {
      const number = this.asNumber(value); const sign = signed && number > 0 ? '+' : ''
      return `${sign}${number.toFixed(Math.abs(number) >= 100 ? 0 : 1)}%`
    },
    formatDrawdown(value) { return `${Math.abs(this.asNumber(value)).toFixed(1)}%` },
    formatRatio(value) { const number = Number(value); return Number.isFinite(number) && number !== 0 ? number.toFixed(2) : '—' },
    formatRating(value) { const number = this.asNumber(value); return number > 0 ? number.toFixed(1) : '—' },
    valueTone(value) { const number = this.asNumber(value); if (number > 0) return 'up'; if (number < 0) return 'down'; return '' },
    scoreClass(item) {
      const score = this.asNumber(item.score)
      if (!this.hasBacktest(item)) return 'empty'
      if (score >= 80) return 'top'
      if (score >= 60) return 'good'
      return ''
    },
    strategyMetrics(item) {
      return [
        { key: 'total', label: this.$t('market.total_return_short'), value: this.formatPercent(item.total_return, true), tone: this.valueTone(item.total_return) },
        { key: 'annual', label: this.$t('market.annual_return_short'), value: this.formatPercent(item.annual_return, true), tone: this.valueTone(item.annual_return) },
        { key: 'drawdown', label: this.$t('market.max_drawdown_short'), value: this.formatDrawdown(item.max_drawdown), tone: 'risk' },
        { key: 'sharpe', label: this.$t('market.sharpe_short'), value: this.formatRatio(item.sharpe), tone: this.asNumber(item.sharpe) >= 1 ? 'up' : '' }
      ]
    },
    strategyMeta(item) {
      const contract = item.marketplace_contract || item.strategy_contract || {}
      const bound = Array.isArray(contract.bound_instruments) ? contract.bound_instruments : []
      const tested = Array.isArray(item.tested_instruments) ? item.tested_instruments : []
      const symbol = bound[0] || tested[0] || ''
      const marketType = contract.market_type || ''
      const frequency = contract.execution_frequency || contract.primary_frequency || item.execution_frequency || ''
      const direction = item.direction_mode ? this.directionLabel(item.direction_mode) : ''
      return [symbol, marketType ? String(marketType).toUpperCase() : '', frequency, direction].filter(Boolean).slice(0, 4)
    },
    directionLabel(value) { const key = `market.filter_direction_${value}`; return this.$te(key) ? this.$t(key) : value },
    indicatorScope(item, limit = 3) {
      const symbols = Array.isArray(item.applicable_symbols) ? item.applicable_symbols : []
      const timeframes = Array.isArray(item.applicable_timeframes) ? item.applicable_timeframes : []
      return symbols.concat(timeframes).filter(Boolean).slice(0, limit)
    },
    visibilityLabel(item) { return item.code_hidden || item.is_encrypted ? this.$t('market.code_hidden') : this.$t('market.code_visible') },
    visibilityTone(item) { return item.code_hidden || item.is_encrypted ? 'protected' : 'visible' },
    authorName(item) {
      const name = item.author?.nickname || item.author?.username || this.$t('market.community_author')
      return this.$t('market.by_author', { name })
    },
    indicatorHasPreview(item) { return !!(item?.preview_image && !this.imageErrors[item.id]) },
    indicatorDescription(item) {
      const description = String(item?.description || item?.summary || '').trim()
      return description || this.$t('market.description_empty')
    },
    priceText(item) {
      return this.isPaidItem(item) ? this.$t('market.price_credits', { price: item.price }) : this.$t('market.price_free')
    },
    isPaidItem(item) { return item?.pricing_type === 'paid' || this.asNumber(item?.price) > 0 },
    compactNumber(value) {
      const number = this.asNumber(value)
      if (number >= 10000) return `${(number / 10000).toFixed(number >= 100000 ? 0 : 1)}w`
      if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`
      return String(Math.round(number))
    },
    shortDesc(text, maxLength = 80) { if (!text) return ''; return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text },
    markImageError(id) { this.imageErrors = { ...this.imageErrors, [id]: true } }
  }
}
</script>

<style scoped>
.market-page{--market-gold:var(--v2-brand,#ffc400);--market-gold-strong:var(--v2-brand-strong,#f4b900);--market-gold-soft:color-mix(in srgb,var(--market-gold) 12%,transparent);min-height:100vh;padding-bottom:calc(24px + var(--safe-area-bottom,0px));background:var(--bg)}
:deep(.van-nav-bar){background:var(--bg-elevated);border-bottom:1px solid var(--border)}:deep(.van-nav-bar::after){display:none}:deep(.van-nav-bar .van-nav-bar__title),:deep(.van-nav-bar .van-icon){color:var(--text)}:deep(.van-nav-bar .van-nav-bar__title){font-size:18px;font-weight:750}
.purchases-link{border:0;background:transparent;color:var(--text);display:inline-flex;align-items:center;gap:5px;font-size:12px}.purchases-link .van-icon{font-size:19px}
.market-controls{padding:10px var(--page-gutter) 8px;background:var(--bg)}.asset-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));background:var(--surface-raised);border:1px solid var(--border);border-radius:14px;overflow:hidden}.asset-tab{min-height:48px;border:0;border-right:1px solid var(--border);background:transparent;color:var(--text-2);display:flex;align-items:center;justify-content:center;gap:7px;font-size:14px;font-weight:650;position:relative}.asset-tab:last-child{border-right:0}.asset-tab::after{content:'';position:absolute;left:10px;right:10px;bottom:0;height:4px;border-radius:999px 999px 0 0;background:transparent}.asset-tab.active{color:var(--text);background:var(--market-gold-soft)}.asset-tab.active::after{background:var(--market-gold)}.asset-tab .van-icon{font-size:17px;color:var(--text-3)}.asset-tab.active .van-icon{color:var(--market-gold-strong)}.asset-tab.active strong{color:var(--text)}.asset-tab strong{font-size:12px}
:deep(.van-search){padding:10px 0 8px;background:transparent}:deep(.van-search__content){min-height:42px;padding-left:13px;background:var(--surface-raised);border:1px solid transparent}:deep(.van-search__content:focus-within){border-color:var(--accent)}:deep(.van-field__control){color:var(--text);font-size:13px}
.filter-rail{display:flex;align-items:center;gap:7px;overflow-x:auto;padding:1px 0 3px;scrollbar-width:none}.filter-rail::-webkit-scrollbar{display:none}.filter-chip{flex:0 0 auto;min-height:34px;padding:0 11px;border-radius:10px;border:1px solid var(--border);background:var(--bg-elevated);color:var(--text-2);display:inline-flex;align-items:center;gap:5px;font-size:11px;white-space:nowrap}.filter-chip.active{color:var(--text);border-color:var(--market-gold);background:var(--market-gold-soft)}.filter-chip.sort{margin-left:auto}.filter-more{width:35px;justify-content:center;padding:0;position:relative}.filter-more b{position:absolute;top:-5px;right:-5px;min-width:16px;height:16px;padding:0 4px;border-radius:999px;display:grid;place-items:center;background:var(--market-gold);color:var(--v2-on-brand,#10131b);font-size:9px}.indicator-filter-rail .filter-chip.sort{margin-left:0}
.section-heading{min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:12px}.section-heading strong{color:var(--text);font-size:17px;font-weight:750}.section-heading button{border:0;background:transparent;color:var(--text-2);display:inline-flex;align-items:center;gap:4px;font-size:11px}.strategy-results,.featured-section,.indicator-results{padding:2px var(--page-gutter) 16px}.strategy-heading{align-items:flex-end;margin-bottom:6px}.strategy-heading>div:first-child{display:flex;flex-direction:column;gap:3px}.strategy-heading small{color:var(--text-3);font-size:10px}.quick-sort{display:flex;align-items:center;padding:3px;border-radius:10px;background:var(--surface-raised)}.quick-sort button{min-height:28px;padding:0 10px;border:0;border-radius:8px;background:transparent;color:var(--text-2);font-size:11px}.quick-sort button.active{background:var(--market-gold);color:var(--v2-on-brand,#10131b);font-weight:700}
.strategy-list{overflow:hidden;border:1px solid var(--border);border-radius:14px;background:var(--bg-elevated)}.strategy-row{display:grid;grid-template-columns:48px minmax(0,1fr) auto;grid-template-areas:'score main price' 'metrics metrics metrics';gap:9px 10px;padding:14px 12px;border-bottom:1px solid var(--border);cursor:pointer}.strategy-row:last-child{border-bottom:0}.strategy-row:active{background:var(--surface-raised)}.strategy-score{grid-area:score;width:48px;height:51px;border-radius:11px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--surface-raised);border:1px solid var(--border);color:var(--text-2)}.strategy-score.top{color:var(--accent);background:var(--accent-soft);border-color:color-mix(in srgb,var(--accent) 30%,var(--border))}.strategy-score.good{color:var(--c-blue);background:var(--c-blue-soft)}.strategy-score strong{font-size:18px;line-height:1}.strategy-score span{margin-top:4px;font-size:9px}.strategy-main{grid-area:main;min-width:0}.strategy-title-line{display:flex;align-items:center;gap:6px;min-width:0}.strategy-title-line h2{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text);font-size:14px;font-weight:720}.tested-badge{flex:none;display:inline-flex;align-items:center;gap:3px;padding:2px 5px;border-radius:999px;color:var(--c-blue);background:var(--c-blue-soft);font-size:9px}.strategy-meta{display:flex;align-items:center;gap:0;margin-top:5px;overflow:hidden;white-space:nowrap;color:var(--text-2);font-size:10px}.strategy-meta span+span::before{content:'·';margin:0 5px;color:var(--text-4)}.strategy-desc{margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--text-3);font-size:10px}.strategy-price{grid-area:price;align-self:start;display:flex;align-items:center;gap:5px;padding-top:2px;color:var(--text-3);font-size:11px}.price-copy{display:flex;flex-direction:column;align-items:flex-end;gap:3px}.strategy-price span{font-weight:700;white-space:nowrap}.price-copy em,.indicator-price em{padding:2px 5px;border-radius:999px;background:var(--market-gold-soft);color:var(--market-gold-strong);font-size:8px;font-style:normal;font-weight:750;white-space:nowrap}.paid{color:var(--accent)!important}.free{color:var(--up)!important}.strategy-metrics{grid-area:metrics;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding-top:9px;border-top:1px solid var(--hairline)}.strategy-metrics>div{min-width:0;padding:0 9px;border-right:1px solid var(--border)}.strategy-metrics>div:first-child{padding-left:0}.strategy-metrics>div:last-child{padding-right:0;border-right:0}.strategy-metrics span{display:block;color:var(--text-3);font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.strategy-metrics strong{display:block;margin-top:4px;color:var(--text);font-size:12px;font-weight:750;white-space:nowrap}.strategy-metrics strong.up{color:var(--up)}.strategy-metrics strong.down{color:var(--down)}
.featured-section{padding-top:2px}.featured-indicator{min-height:154px;padding:14px;border:1px solid var(--border);border-radius:14px;background:var(--bg-elevated);box-shadow:var(--shadow-card);cursor:pointer}.featured-indicator.has-preview{display:grid;grid-template-columns:42% minmax(0,1fr);gap:14px}.featured-indicator.no-preview{border-top:4px solid var(--market-gold)}.featured-preview,.indicator-preview{position:relative;overflow:hidden;border-radius:10px;background:var(--surface-raised);border:1px solid var(--hairline)}.featured-preview{min-height:136px}.featured-preview img,.indicator-preview img{width:100%;height:100%;object-fit:cover;display:block}.featured-copy{min-width:0;display:flex;flex-direction:column}.indicator-title-row{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}.indicator-heading-copy,.indicator-card-title{min-width:0;display:flex;align-items:flex-start;gap:10px}.indicator-heading-copy>div,.indicator-card-title>div{min-width:0}.indicator-mark{flex:none;width:42px;height:42px;display:grid;place-items:center;border-radius:11px;color:var(--v2-on-brand,#10131b);background:var(--market-gold);font-size:21px}.indicator-mark.compact{width:34px;height:34px;border-radius:9px;font-size:17px}.indicator-title-row h2,.indicator-body h2{min-width:0;color:var(--text);font-weight:720}.indicator-title-row h2{font-size:15px;line-height:1.35}.price-tag{flex:none;padding:4px 7px;border-radius:999px;background:var(--surface-raised);font-size:9px;font-weight:700}.author-line{margin-top:4px;color:var(--text-3);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.indicator-description{display:-webkit-box;overflow:hidden;-webkit-box-orient:vertical;-webkit-line-clamp:2;margin-top:10px;color:var(--text-2);font-size:10px;line-height:1.55}.featured-description{max-width:620px;font-size:11px}.indicator-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}.indicator-tags span{max-width:88px;padding:3px 6px;border-radius:7px;color:var(--text-2);background:var(--surface-raised);font-size:9px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.indicator-stats{display:flex;align-items:center;gap:10px;margin-top:auto;padding-top:10px;color:var(--text-2);font-size:10px}.indicator-stats span{display:inline-flex;align-items:center;gap:3px}.indicator-stats span:first-child .van-icon,.indicator-card-footer span:first-child .van-icon{color:var(--market-gold-strong)}.detail-arrow{margin-left:auto;color:var(--text);font-size:16px}
.indicator-results{padding-top:0}.indicator-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:9px}.indicator-card{min-width:0;overflow:hidden;display:flex;flex-direction:column;border-radius:13px;border:1px solid var(--border);background:var(--bg-elevated);box-shadow:var(--shadow-card);cursor:pointer}.indicator-card.no-preview{border-top:3px solid var(--market-gold)}.indicator-preview{height:96px;border:0;border-bottom:1px solid var(--hairline);border-radius:0}.visibility-badge{position:absolute;left:8px;bottom:7px;padding:3px 6px;border-radius:6px;border:1px solid transparent;font-size:8px;font-weight:700}.visibility-badge.visible{color:var(--c-blue);background:var(--c-blue-soft);border-color:color-mix(in srgb,var(--c-blue) 24%,transparent)}.visibility-badge.protected{color:var(--c-violet);background:var(--c-violet-soft);border-color:color-mix(in srgb,var(--c-violet) 24%,transparent)}.visibility-badge.inline{position:static;flex:none;margin-left:auto}.indicator-body{padding:11px;display:flex;flex-direction:column}.indicator-card-title{align-items:center}.indicator-body h2{font-size:13px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.indicator-tags.compact{margin-top:8px;flex-wrap:nowrap;overflow:hidden}.indicator-tags.compact span{flex:0 1 auto}.indicator-card-footer{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:9px;border-top:1px solid var(--hairline);color:var(--text-2);font-size:9px}.indicator-card-footer span{display:inline-flex;align-items:center;gap:3px}.indicator-price{margin-left:auto;display:flex;align-items:flex-end;flex-direction:column;gap:3px}.indicator-card-footer strong{font-size:10px;white-space:nowrap}
.market-pagination{margin:0 var(--page-gutter) 22px;padding:8px;display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;border:1px solid var(--border);border-radius:13px;background:var(--bg-elevated)}.market-pagination button{min-height:38px;padding:0 12px;display:flex;align-items:center;justify-content:center;gap:6px;border:0;border-radius:9px;background:var(--surface-raised);color:var(--text);font-size:11px;font-weight:650}.market-pagination button:last-child{background:var(--market-gold);color:var(--v2-on-brand,#10131b)}.market-pagination button:disabled{opacity:.32}.page-status{min-width:48px;text-align:center;color:var(--text-3);font-size:11px}.page-status strong{color:var(--text);font-size:14px}.page-status em{font-style:normal}.market-loading{min-height:84px;display:flex;align-items:center;justify-content:center;gap:8px;color:var(--text-2);font-size:12px}.market-loading :deep(.van-loading__spinner){color:var(--market-gold)}
.market-empty{margin:18px var(--page-gutter) 28px;padding:28px 20px;display:flex;flex-direction:column;align-items:center;text-align:center;border:1px solid var(--border);border-radius:14px;background:var(--bg-elevated)}.empty-icon{width:46px;height:46px;display:grid;place-items:center;margin-bottom:12px;border-radius:13px;color:var(--accent);background:var(--accent-soft);font-size:23px}.market-empty strong{color:var(--text);font-size:16px}.market-empty p{max-width:280px;margin:8px 0 18px;color:var(--text-2);font-size:12px;line-height:1.55}.empty-actions{display:flex;gap:10px}
.strategy-filter-popup {
  max-height: 88vh;
  max-height: 88dvh;
  overflow-y: auto;
  background: var(--bg-elevated);
}
.filter-sheet{padding:20px 18px calc(22px + var(--safe-area-bottom,0px))}.filter-sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;color:var(--text)}.filter-sheet-head strong{font-size:17px}.filter-sheet-head button{border:0;background:transparent;color:var(--accent);font-size:13px}.filter-group{margin-top:17px;padding:1px 0}.filter-group.focused{padding:12px;margin-left:-12px;margin-right:-12px;border-radius:12px;background:var(--accent-softer)}.filter-group label{display:block;margin-bottom:9px;color:var(--text-2);font-size:12px;font-weight:700}.filter-chips{display:flex;flex-wrap:wrap;gap:8px}.filter-chips button{min-height:32px;padding:0 12px;border-radius:999px;color:var(--text-2);background:var(--surface-raised);border:1px solid var(--border);font-size:12px}.filter-chips button.active{color:var(--text-on-accent);background:var(--accent);border-color:var(--accent)}.filter-sheet-actions{display:grid;grid-template-columns:1fr 1.4fr;gap:10px;margin-top:24px}
@media(max-width:360px){.strategy-desc{display:none}.strategy-row{grid-template-columns:44px minmax(0,1fr) auto}.strategy-score{width:44px}.strategy-metrics>div{padding:0 6px}.featured-indicator{grid-template-columns:39% minmax(0,1fr)}}
</style>
