<template>
  <div class="indicator-chart-page">
    <van-nav-bar
      :title="$t('indicator_chart.title')"
      :border="false"
    />

    <section class="control-card">
      <button type="button" class="selector" @click="indicatorSheetOpen = true">
        <span>{{ $t('indicator_chart.indicator') }}</span>
        <strong>{{ selectedIndicatorName }}</strong>
        <van-icon name="arrow" />
      </button>
      <button type="button" class="selector" @click="symbolPickerOpen = true">
        <span>{{ $t('indicator_chart.symbol') }}</span>
        <strong>{{ form.symbol || $t('indicator_chart.choose_symbol') }}</strong>
        <small>{{ form.market }}</small>
        <van-icon name="arrow" />
      </button>
      <div class="timeframes">
        <button
          v-for="item in timeframes"
          :key="item"
          type="button"
          :class="{ active: form.timeframe === item }"
          @click="selectTimeframe(item)"
        >{{ item }}</button>
      </div>
    </section>

    <section class="chart-card">
      <div class="chart-head">
        <div class="chart-copy">
          <div class="quote-row">
            <strong>{{ form.symbol || '--' }}</strong>
            <b v-if="latestPrice !== null">{{ formatPrice(latestPrice) }}</b>
            <em v-if="priceChangePercent !== null" :class="priceChangePercent >= 0 ? 'up' : 'down'">
              {{ priceChangePercent >= 0 ? '+' : '' }}{{ priceChangePercent.toFixed(2) }}%
            </em>
          </div>
          <span>{{ form.timeframe }} · {{ selectedIndicatorName }}</span>
          <small v-if="lastUpdatedAt">{{ $t('indicator_chart.updated_at', { time: updatedText }) }}</small>
        </div>
        <button type="button" :aria-label="$t('common.refresh')" @click="loadChart">
          <van-icon name="replay" />
        </button>
      </div>

      <div v-if="candles.length" class="chart-toolbar">
        <div class="window-status">
          <van-icon name="exchange" />
          <span>{{ $t('indicator_chart.drag_hint') }}</span>
          <small>{{ candles.length }} / {{ rawCandles.length }}</small>
        </div>
        <div class="zoom-controls">
          <button type="button" :aria-label="$t('indicator_chart.zoom_out')" @click="zoomChart(1)">
            <van-icon name="minus" />
          </button>
          <button type="button" :aria-label="$t('indicator_chart.zoom_in')" @click="zoomChart(-1)">
            <van-icon name="plus" />
          </button>
          <button
            type="button"
            :class="{ active: isLatestWindow }"
            :aria-label="$t('indicator_chart.reset_view')"
            @click="resetChartView"
          >
            {{ $t('indicator_chart.latest') }}
          </button>
        </div>
      </div>

      <div v-if="loading" class="chart-state">
        <van-loading color="var(--primary)" vertical>{{ $t('indicator_chart.loading') }}</van-loading>
      </div>
      <div v-else-if="errorMessage" class="chart-state error">
        <van-icon name="warning-o" />
        <span>{{ errorMessage }}</span>
        <van-button size="small" round type="primary" @click="loadChart">{{ $t('common.retry') }}</van-button>
      </div>
      <div v-else-if="!candles.length" class="chart-state">
        <van-empty :description="$t('indicator_chart.empty')" />
      </div>
      <div v-else :class="['svg-wrap', { dragging: dragState }]">
        <svg
          class="signal-chart"
          viewBox="0 0 360 314"
          role="img"
          :aria-label="$t('indicator_chart.chart_label')"
          @pointerdown="onChartPointerDown"
          @pointermove="onChartPointerMove"
          @pointerup="onChartPointerUp"
          @pointercancel="onChartPointerCancel"
          @wheel.prevent="onChartWheel"
        >
          <defs>
            <linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="var(--primary)" stop-opacity=".12" />
              <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
            </linearGradient>
          </defs>

          <g class="grid">
            <line v-for="y in [30, 75, 120, 165, 210]" :key="`g-${y}`" x1="12" :y1="y" x2="348" :y2="y" />
          </g>
          <g class="axis-labels price-axis">
            <text v-for="tick in priceTicks" :key="`price-${tick.y}`" x="346" :y="tick.y - 3" text-anchor="end">
              {{ tick.label }}
            </text>
          </g>

          <g class="candles">
            <g v-for="candle in candleShapes" :key="candle.key">
              <line
                :x1="candle.x"
                :x2="candle.x"
                :y1="candle.highY"
                :y2="candle.lowY"
                :class="candle.up ? 'up-stroke' : 'down-stroke'"
              />
              <rect
                :x="candle.x - candle.width / 2"
                :y="candle.bodyY"
                :width="candle.width"
                :height="candle.bodyHeight"
                rx=".7"
                :class="candle.up ? 'up-fill' : 'down-fill'"
              />
            </g>
          </g>

          <g v-if="selectedCandleShape" class="crosshair">
            <line :x1="selectedCandleShape.x" :x2="selectedCandleShape.x" y1="20" y2="288" />
            <line x1="12" x2="348" :y1="selectedCandleShape.closeY" :y2="selectedCandleShape.closeY" />
            <circle :cx="selectedCandleShape.x" :cy="selectedCandleShape.closeY" r="3.5" />
          </g>

          <path
            v-for="plot in overlayPlots"
            :key="`overlay-${plot.name}`"
            :d="linePath(plot.data, false)"
            fill="none"
            :stroke="plot.color || '#f5b93f'"
            :stroke-dasharray="plot.style === 'dashed' ? '5 4' : ''"
            stroke-width="1.5"
          />

          <g v-for="marker in signalMarkers" :key="marker.key" class="signal-marker">
            <title>{{ marker.details }}</title>
            <path
              v-if="marker.side === 'buy'"
              :d="`M ${marker.x} ${marker.y - 7} l -5 8 h 10 z`"
              :fill="marker.color"
            />
            <path
              v-else-if="marker.side === 'sell'"
              :d="`M ${marker.x} ${marker.y + 7} l -5 -8 h 10 z`"
              :fill="marker.color"
            />
            <circle v-else :cx="marker.x" :cy="marker.y" r="4" :fill="marker.color" />
            <text v-if="marker.showLabel" :x="marker.x" :y="marker.labelY" text-anchor="middle">
              {{ marker.label }}
            </text>
          </g>

          <g class="volume-pane">
            <rect x="12" y="222" width="336" height="66" rx="6" fill="var(--surface-raised)" />
            <text x="17" y="233">VOL</text>
            <rect
              v-for="bar in volumeShapes"
              :key="bar.key"
              :x="bar.x"
              :y="bar.y"
              :width="bar.width"
              :height="bar.height"
              :class="bar.up ? 'volume-up' : 'volume-down'"
            />
          </g>
          <g v-if="lowerPlots.length" class="lower-pane">
            <rect x="12" y="222" width="336" height="66" rx="6" fill="var(--surface-raised)" fill-opacity=".38" />
            <path
              v-for="plot in lowerPlots"
              :key="`lower-${plot.name}`"
              :d="linePath(plot.data, true)"
              fill="none"
              :stroke="plot.color || '#7c5cff'"
              :stroke-dasharray="plot.style === 'dashed' ? '5 4' : ''"
              stroke-width="1.5"
            />
          </g>
          <g class="axis-labels time-axis">
            <text v-for="tick in timeTicks" :key="`time-${tick.x}`" :x="tick.x" y="307" :text-anchor="tick.anchor">
              {{ tick.label }}
            </text>
          </g>
        </svg>
      </div>

      <div v-if="displayCandle" class="candle-inspector" aria-live="polite">
        <div class="inspector-head">
          <span>{{ selectedCandle ? $t('indicator_chart.selected_candle') : $t('indicator_chart.latest_candle') }}</span>
          <strong>{{ candleTime(displayCandle) }}</strong>
        </div>
        <div class="ohlcv-grid">
          <div><span>O</span><strong>{{ candleValue(displayCandle, 'open') }}</strong></div>
          <div><span>H</span><strong>{{ candleValue(displayCandle, 'high') }}</strong></div>
          <div><span>L</span><strong>{{ candleValue(displayCandle, 'low') }}</strong></div>
          <div><span>C</span><strong>{{ candleValue(displayCandle, 'close') }}</strong></div>
          <div><span>VOL</span><strong>{{ candleValue(displayCandle, 'volume') }}</strong></div>
          <div><span>{{ $t('indicator_chart.signals_short') }}</span><strong>{{ displayCandleSignalLabels.length }}</strong></div>
        </div>
        <div v-if="displayCandleSignalLabels.length" class="inspector-signals">
          <span v-for="signal in displayCandleSignalLabels" :key="signal">{{ signal }}</span>
        </div>
      </div>

      <div v-if="candles.length" class="legend">
        <span v-for="plot in displayPlots" :key="plot.name">
          <i :style="{ background: plot.color || '#f5b93f' }"></i>{{ plot.name }}
        </span>
      </div>
    </section>

    <section v-if="latestSignal" :class="['latest-card', signalSide(latestSignal) ]">
      <div class="latest-icon"><van-icon :name="signalSide(latestSignal) === 'buy' ? 'arrow-up' : signalSide(latestSignal) === 'sell' ? 'arrow-down' : 'flag-o'" /></div>
      <div>
        <span>{{ $t('indicator_chart.latest_signal') }}</span>
        <strong>{{ latestSignalLabel }}</strong>
        <small>{{ formatSignalTime(latestSignal.bar_time) }} · {{ formatPrice(latestSignal.price) }}</small>
      </div>
    </section>
    <section v-else-if="candles.length" class="latest-card neutral">
      <div class="latest-icon"><van-icon name="info-o" /></div>
      <div>
        <span>{{ $t('indicator_chart.latest_signal') }}</span>
        <strong>{{ $t('indicator_chart.no_signal') }}</strong>
        <small>{{ $t('indicator_chart.no_signal_hint') }}</small>
      </div>
    </section>

    <ChartTradePanel
      :market="form.market"
      :symbol="form.symbol"
      :chart-price="latestPrice"
      :initial-open="String($route.query.trade || '') === '1'"
      @context-change="onTradeContextChange"
    />

    <details v-if="parameterDefinitions.length" class="parameter-card">
      <summary>
        <div class="section-title">
          <div>
            <strong>{{ $t('indicator_chart.parameters') }}</strong>
            <span>{{ $t('indicator_chart.parameters_hint') }}</span>
          </div>
          <van-icon name="arrow-down" />
        </div>
      </summary>
      <div class="parameter-content">
        <div v-for="parameter in parameterDefinitions" :key="parameter.name" class="parameter-row">
          <div>
            <strong>{{ parameterLabel(parameter) }}</strong>
            <span>{{ parameter.name }}</span>
          </div>
          <van-switch
            v-if="parameter.type === 'bool'"
            v-model="form.params[parameter.name]"
            size="20"
          />
          <van-field
            v-else
            v-model="form.params[parameter.name]"
            :type="isNumericParameter(parameter) ? 'number' : 'text'"
            input-align="right"
            :placeholder="String(parameter.default ?? '')"
          />
        </div>
        <van-button block type="primary" :loading="loading" @click="loadChart">
          {{ $t('indicator_chart.apply') }}
        </van-button>
      </div>
    </details>

    <div class="read-only-hint">
      <van-icon name="shield-o" />
      <span>{{ $t('chart_trade.chart_risk_hint') }}</span>
    </div>

    <van-action-sheet
      v-model:show="indicatorSheetOpen"
      :actions="indicatorActions"
      :title="$t('indicator_chart.choose_indicator')"
      :cancel-text="$t('common.cancel')"
      @select="selectIndicator"
    />
    <SymbolPicker
      v-model:show="symbolPickerOpen"
      :title="$t('indicator_chart.choose_symbol')"
      :auto-add="false"
      :default-market="form.market"
      @pick="selectSymbol"
    />
  </div>
</template>

<script>
import SymbolPicker from '@/components/SymbolPicker.vue'
import ChartTradePanel from '@/components/ChartTradePanel.vue'
import { indicatorApi } from '@/api'

const CHART_LEFT = 12
const CHART_RIGHT = 348
const MAIN_TOP = 20
const MAIN_BOTTOM = 210
const LOWER_TOP = 228
const LOWER_BOTTOM = 284
const DEFAULT_VISIBLE_BARS = 56
const MIN_VISIBLE_BARS = 20
const MAX_VISIBLE_BARS = 120

export default {
  name: 'IndicatorChart',
  components: { SymbolPicker, ChartTradePanel },
  data() {
    return {
      loading: false,
      errorMessage: '',
      indicators: [],
      parameterDefinitions: [],
      chartData: null,
      lastUpdatedAt: 0,
      visibleBars: DEFAULT_VISIBLE_BARS,
      viewEnd: 0,
      selectedCandleIndex: null,
      dragState: null,
      indicatorSheetOpen: false,
      symbolPickerOpen: false,
      timeframes: ['5m', '15m', '1H', '4H', '1D'],
      form: {
        indicatorId: 0,
        market: String(this.$route.query.market || 'Crypto'),
        symbol: String(this.$route.query.symbol || 'BTC/USDT'),
        timeframe: String(this.$route.query.timeframe || '1H'),
        exchangeId: String(this.$route.query.exchange_id || ''),
        marketType: String(this.$route.query.market_type || ''),
        params: {}
      }
    }
  },
  computed: {
    selectedIndicator() {
      return this.indicators.find((item) => Number(item.id) === Number(this.form.indicatorId)) || null
    },
    selectedIndicatorName() {
      return this.selectedIndicator?.name || this.$t('indicator_chart.choose_indicator')
    },
    indicatorActions() {
      return this.indicators.map((item) => ({
        name: item.name || `#${item.id}`,
        subname: item.description || '',
        indicatorId: Number(item.id)
      }))
    },
    rawCandles() {
      return Array.isArray(this.chartData?.candles) ? this.chartData.candles : []
    },
    viewEndIndex() {
      const total = this.rawCandles.length
      return Math.max(Math.min(this.viewEnd || total, total), Math.min(this.visibleBars, total))
    },
    viewStart() {
      return Math.max(0, this.viewEndIndex - Math.min(this.visibleBars, this.rawCandles.length))
    },
    candles() {
      return this.rawCandles.slice(this.viewStart, this.viewEndIndex)
    },
    visibleOffset() {
      return this.viewStart
    },
    displayPlots() {
      const plots = Array.isArray(this.chartData?.plots) ? this.chartData.plots : []
      const layers = Array.isArray(this.chartData?.layers)
        ? this.chartData.layers.filter((item) => Array.isArray(item?.data))
        : []
      return [...plots, ...layers].filter((item) => Array.isArray(item?.data))
    },
    overlayPlots() {
      return this.displayPlots.filter((item) => item.overlay !== false)
    },
    lowerPlots() {
      return this.displayPlots.filter((item) => item.overlay === false)
    },
    mainRange() {
      const values = []
      this.candles.forEach((item) => values.push(Number(item.low), Number(item.high)))
      this.overlayPlots.forEach((plot) => {
        plot.data.slice(this.visibleOffset).forEach((value) => {
          const n = this.plotValue(value, false)
          if (n !== null) values.push(n)
        })
      })
      return this.rangeFor(values)
    },
    lowerRange() {
      const values = []
      this.lowerPlots.forEach((plot) => {
        plot.data.slice(this.visibleOffset).forEach((value) => {
          const n = this.plotValue(value, true)
          if (n !== null) values.push(n)
        })
      })
      return this.rangeFor(values)
    },
    candleShapes() {
      const count = this.candles.length || 1
      const step = (CHART_RIGHT - CHART_LEFT) / count
      const width = Math.max(1.5, Math.min(4.5, step * 0.62))
      return this.candles.map((item, index) => {
        const open = Number(item.open)
        const close = Number(item.close)
        const x = CHART_LEFT + step * index + step / 2
        const openY = this.yFor(open, this.mainRange, false)
        const closeY = this.yFor(close, this.mainRange, false)
        return {
          key: `${item.time || index}-${index}`,
          x,
          width,
          highY: this.yFor(Number(item.high), this.mainRange, false),
          lowY: this.yFor(Number(item.low), this.mainRange, false),
          bodyY: Math.min(openY, closeY),
          bodyHeight: Math.max(1, Math.abs(openY - closeY)),
          up: close >= open
        }
      })
    },
    selectedCandle() {
      if (this.selectedCandleIndex === null) return null
      return this.candles[this.selectedCandleIndex] || null
    },
    displayCandle() {
      return this.selectedCandle || this.candles[this.candles.length - 1] || null
    },
    selectedCandleShape() {
      if (this.selectedCandleIndex === null) return null
      const candle = this.candles[this.selectedCandleIndex]
      const shape = this.candleShapes[this.selectedCandleIndex]
      if (!candle || !shape) return null
      return {
        ...shape,
        closeY: this.yFor(Number(candle.close), this.mainRange, false)
      }
    },
    volumeShapes() {
      const count = this.candles.length || 1
      const step = (CHART_RIGHT - CHART_LEFT) / count
      const width = Math.max(1.5, Math.min(5, step * 0.68))
      const volumes = this.candles.map((item) => Number(item.volume ?? item.vol ?? item.quote_volume ?? 0))
      const max = Math.max(...volumes.filter(Number.isFinite), 1)
      return this.candles.map((item, index) => {
        const volume = Number(item.volume ?? item.vol ?? item.quote_volume ?? 0)
        const height = Math.max(1, (Number.isFinite(volume) ? volume : 0) / max * 48)
        return {
          key: `volume-${item.time || item.timestamp || index}-${index}`,
          x: CHART_LEFT + step * index + step / 2 - width / 2,
          y: LOWER_BOTTOM - height,
          width,
          height,
          up: Number(item.close) >= Number(item.open)
        }
      })
    },
    signalMarkers() {
      const signals = Array.isArray(this.chartData?.signals) ? this.chartData.signals : []
      const count = this.candles.length || 1
      const step = (CHART_RIGHT - CHART_LEFT) / count
      const groups = new Map()
      signals.forEach((signal, signalIndex) => {
        const data = Array.isArray(signal?.data) ? signal.data : []
        const textData = Array.isArray(signal?.textData) ? signal.textData : []
        const visible = data.slice(this.viewStart, this.viewEndIndex)
        const dense = visible.filter((value) => this.markerActive(value)).length / Math.max(visible.length, 1) > 0.18
        visible.forEach((value, index) => {
          const absoluteIndex = this.viewStart + index
          if (!this.markerActive(value)) return
          if (dense && index > 0 && this.markerActive(visible[index - 1])) return
          const candle = this.candles[index]
          if (!candle) return
          const side = this.signalSide(signal)
          const numeric = typeof value === 'number' && Number.isFinite(value) && value !== 0
          const fallback = side === 'sell' ? Number(candle.high) : Number(candle.low)
          const price = numeric ? value : fallback
          const rawLabel = this.signalLabel(signal, textData[absoluteIndex])
          const groupKey = `${absoluteIndex}-${side}`
          const current = groups.get(groupKey) || {
            key: groupKey,
            absoluteIndex,
            index,
            side,
            labels: [],
            prices: [],
            colors: []
          }
          if (!current.labels.includes(rawLabel)) current.labels.push(rawLabel)
          if (Number.isFinite(price)) current.prices.push(price)
          current.colors.push(signal.color)
          groups.set(groupKey, current)
        })
      })
      let mode = this.signalDisplayMode
      const markerDensity = groups.size / Math.max(count, 1)
      if (mode === 'full' && (groups.size > 12 || markerDensity > 0.18)) mode = 'compact'
      if (mode === 'compact' && (groups.size > 24 || markerDensity > 0.34)) mode = 'marker'
      const laneState = { buy: { index: -99, lane: 0 }, sell: { index: -99, lane: 0 }, neutral: { index: -99, lane: 0 } }
      const minGapBars = mode === 'full' ? Math.max(3, Math.ceil(44 / Math.max(step, 1))) : Math.max(2, Math.ceil(26 / Math.max(step, 1)))
      return Array.from(groups.values())
        .sort((a, b) => a.index - b.index || a.side.localeCompare(b.side))
        .map((group) => {
          const state = laneState[group.side] || laneState.neutral
          state.lane = group.index - state.index < minGapBars ? (state.lane + 1) % 3 : 0
          state.index = group.index
          const candle = this.candles[group.index]
          const price = group.prices.length
            ? (group.side === 'sell' ? Math.max(...group.prices) : Math.min(...group.prices))
            : Number(group.side === 'sell' ? candle?.high : candle?.low)
          const baseY = this.yFor(price, this.mainRange, false)
          const laneOffset = 7 + state.lane * 10
          const y = group.side === 'sell'
            ? Math.max(25, baseY - laneOffset)
            : group.side === 'buy'
              ? Math.min(207, baseY + laneOffset)
              : Math.max(25, Math.min(207, baseY))
          const label = mode === 'full'
            ? this.fullSignalLabel(group.labels)
            : this.compactSignalLabel(group.labels, group.side)
          return {
            key: group.key,
            x: CHART_LEFT + step * group.index + step / 2,
            y,
            labelY: group.side === 'sell' ? y - 10 : y + 13,
            side: group.side,
            label,
            details: group.labels.join(' · '),
            showLabel: mode !== 'marker',
            color: group.colors.find(Boolean) || (group.side === 'buy' ? '#18b87a' : group.side === 'sell' ? '#ef5350' : '#f5b93f')
          }
        })
    },
    signalDisplayMode() {
      if (this.candles.length <= 60) return 'full'
      if (this.candles.length <= 96) return 'compact'
      return 'marker'
    },
    displayCandleSignalLabels() {
      if (!this.displayCandle) return []
      const visibleIndex = this.selectedCandleIndex === null ? this.candles.length - 1 : this.selectedCandleIndex
      const absoluteIndex = this.viewStart + visibleIndex
      const labels = []
      const signals = Array.isArray(this.chartData?.signals) ? this.chartData.signals : []
      signals.forEach((signal) => {
        const value = Array.isArray(signal?.data) ? signal.data[absoluteIndex] : null
        if (!this.markerActive(value)) return
        const text = Array.isArray(signal?.textData) ? signal.textData[absoluteIndex] : ''
        const label = this.signalLabel(signal, text)
        if (!labels.includes(label)) labels.push(label)
      })
      return labels.slice(0, 5)
    },
    latestSignal() {
      return this.chartData?.latest_signal || null
    },
    latestSignalLabel() {
      const side = this.signalSide(this.latestSignal)
      if (side === 'buy') return this.$t('indicator_chart.signal_buy')
      if (side === 'sell') return this.$t('indicator_chart.signal_sell')
      return this.$t('indicator_chart.signal_neutral')
    },
    latestPrice() {
      const candle = this.displayCandle
      const value = Number(candle?.close)
      return Number.isFinite(value) ? value : null
    },
    priceChangePercent() {
      const first = Number(this.displayCandle?.open)
      if (!Number.isFinite(first) || first === 0 || this.latestPrice === null) return null
      return ((this.latestPrice - first) / first) * 100
    },
    priceTicks() {
      const rows = [30, 75, 120, 165, 210]
      return rows.map((y) => {
        const ratio = (y - MAIN_TOP) / (MAIN_BOTTOM - MAIN_TOP)
        const value = this.mainRange.max - ratio * (this.mainRange.max - this.mainRange.min)
        return { y, label: this.formatAxisPrice(value) }
      })
    },
    timeTicks() {
      if (!this.candles.length) return []
      const indexes = [0, Math.floor((this.candles.length - 1) / 2), this.candles.length - 1]
      const anchors = ['start', 'middle', 'end']
      return indexes.map((index, tickIndex) => ({
        x: tickIndex === 0 ? CHART_LEFT : (tickIndex === 1 ? (CHART_LEFT + CHART_RIGHT) / 2 : CHART_RIGHT),
        anchor: anchors[tickIndex],
        label: this.formatAxisTime(this.candles[index]?.time || this.candles[index]?.timestamp || this.candles[index]?.open_time)
      }))
    },
    updatedText() {
      return this.lastUpdatedAt ? new Date(this.lastUpdatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''
    },
    visibleSignalCount() {
      const signals = Array.isArray(this.chartData?.signals) ? this.chartData.signals : []
      return signals.reduce((count, signal) => (
        count + (Array.isArray(signal?.data)
          ? signal.data.slice(this.viewStart, this.viewEndIndex).filter((value) => this.markerActive(value)).length
          : 0)
      ), 0)
    },
    isLatestWindow() {
      return this.viewEndIndex >= this.rawCandles.length
    }
  },
  async mounted() {
    await this.loadIndicators()
  },
  methods: {
    async loadIndicators() {
      this.loading = true
      this.errorMessage = ''
      try {
        const res = await indicatorApi.getList()
        this.indicators = res.data || []
        const requested = Number(this.$route.query.indicator_id || this.$route.query.local_copy_id || 0)
        const preferred = this.indicators.find((item) => Number(item.id) === requested) || this.indicators[0]
        if (preferred) {
          this.form.indicatorId = Number(preferred.id)
          await this.loadParameters()
          await this.loadChart()
        }
      } catch (error) {
        this.errorMessage = error?.message || this.$t('indicator_chart.load_failed')
      } finally {
        this.loading = false
      }
    },
    async loadParameters() {
      this.parameterDefinitions = []
      this.form.params = {}
      if (!this.form.indicatorId) return
      try {
        const res = await indicatorApi.getParams(this.form.indicatorId)
        this.parameterDefinitions = res.data || []
        this.parameterDefinitions.forEach((parameter) => {
          this.form.params[parameter.name] = parameter.default ?? ''
        })
      } catch {
        this.parameterDefinitions = []
      }
    },
    async loadChart() {
      if (!this.form.indicatorId || !this.form.symbol) return
      this.loading = true
      this.errorMessage = ''
      try {
        const res = await indicatorApi.previewChart({
          indicator_id: this.form.indicatorId,
          market: this.form.market,
          symbol: this.form.symbol,
          timeframe: this.form.timeframe,
          exchange_id: this.form.exchangeId || undefined,
          market_type: this.form.marketType || undefined,
          params: this.normalizedParams(),
          limit: 240
        })
        this.chartData = res.data || null
        this.lastUpdatedAt = Date.now()
        this.resetChartView()
      } catch (error) {
        this.chartData = null
        this.errorMessage = error?.message || this.$t('indicator_chart.load_failed')
      } finally {
        this.loading = false
      }
    },
    async selectIndicator(action) {
      this.indicatorSheetOpen = false
      this.form.indicatorId = Number(action.indicatorId)
      await this.loadParameters()
      await this.loadChart()
    },
    async selectSymbol(item) {
      this.form.market = item.market || 'Crypto'
      this.form.symbol = item.symbol || ''
      this.form.exchangeId = item.exchange_id || ''
      this.form.marketType = item.market_type || ''
      await this.loadChart()
    },
    selectTimeframe(timeframe) {
      if (this.form.timeframe === timeframe) return
      this.form.timeframe = timeframe
      this.loadChart()
    },
    onTradeContextChange(context = {}) {
      const exchangeId = String(context.exchangeId || '')
      const marketType = String(context.marketType || '')
      if (exchangeId === this.form.exchangeId && marketType === this.form.marketType) return
      this.form.exchangeId = exchangeId
      this.form.marketType = marketType
      if (this.form.indicatorId && this.form.symbol) this.loadChart()
    },
    normalizedParams() {
      const output = {}
      this.parameterDefinitions.forEach((parameter) => {
        const value = this.form.params[parameter.name]
        if (parameter.type === 'bool') output[parameter.name] = Boolean(value)
        else if (this.isNumericParameter(parameter)) {
          const numeric = Number(value)
          output[parameter.name] = Number.isFinite(numeric) ? numeric : parameter.default
        } else output[parameter.name] = value
      })
      return output
    },
    isNumericParameter(parameter) {
      return ['int', 'integer', 'float', 'number'].includes(String(parameter?.type || '').toLowerCase())
    },
    parameterLabel(parameter) {
      if (parameter?.label_key && this.$te(parameter.label_key)) return this.$t(parameter.label_key)
      const localized = {
        atr_period: this.$t('indicator_chart.param_atr_period'),
        multiplier: this.$t('indicator_chart.param_multiplier'),
        period: this.$t('indicator_chart.param_period'),
        fast_period: this.$t('indicator_chart.param_fast_period'),
        slow_period: this.$t('indicator_chart.param_slow_period'),
        signal_period: this.$t('indicator_chart.param_signal_period')
      }
      if (localized[parameter?.name]) return localized[parameter.name]
      return parameter?.label || parameter?.description || String(parameter?.name || '').replace(/_/g, ' ')
    },
    rangeFor(values) {
      const finite = values.filter(Number.isFinite)
      if (!finite.length) return { min: 0, max: 1 }
      let min = Math.min(...finite)
      let max = Math.max(...finite)
      if (max === min) {
        min -= Math.abs(min || 1) * 0.01
        max += Math.abs(max || 1) * 0.01
      }
      const padding = (max - min) * 0.08
      return { min: min - padding, max: max + padding }
    },
    yFor(value, range, lower) {
      const top = lower ? LOWER_TOP : MAIN_TOP
      const bottom = lower ? LOWER_BOTTOM : MAIN_BOTTOM
      const ratio = (Number(value) - range.min) / Math.max(range.max - range.min, 1e-9)
      return bottom - Math.max(0, Math.min(1, ratio)) * (bottom - top)
    },
    linePath(data, lower) {
      const visible = data.slice(this.viewStart, this.viewEndIndex)
      const count = this.candles.length || 1
      const step = (CHART_RIGHT - CHART_LEFT) / count
      const range = lower ? this.lowerRange : this.mainRange
      let path = ''
      let drawing = false
      visible.forEach((value, index) => {
        const numeric = this.plotValue(value, lower)
        if (numeric === null) {
          drawing = false
          return
        }
        const x = CHART_LEFT + step * index + step / 2
        const y = this.yFor(numeric, range, lower)
        path += `${drawing ? ' L' : ' M'} ${x.toFixed(2)} ${y.toFixed(2)}`
        drawing = true
      })
      return path
    },
    plotValue(value, lower) {
      if (value === null || value === undefined || typeof value === 'boolean') return null
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return null
      // Many PC indicators use zero as an inactive overlay placeholder.
      // It is not a real price and must not flatten the candle scale.
      if (!lower && numeric === 0 && this.candles.some((item) => Number(item.low) > 0)) return null
      return numeric
    },
    markerActive(value) {
      if (value === null || value === undefined || value === false || value === 0) return false
      if (typeof value === 'number') return Number.isFinite(value) && value !== 0
      if (typeof value === 'string') return !['', '0', 'false', 'none', 'null', 'nan'].includes(value.trim().toLowerCase())
      if (typeof value === 'object') return this.markerActive(value.active ?? value.signal ?? value.price ?? value.value)
      return Boolean(value)
    },
    signalLabel(signal, text) {
      return String(text || signal?.text || signal?.type || 'Signal').trim().replace(/\s+/g, ' ')
    },
    fullSignalLabel(labels) {
      const first = String(labels[0] || 'Signal')
      const suffix = labels.length > 1 ? ` +${labels.length - 1}` : ''
      return `${first.slice(0, 13)}${suffix}`
    },
    compactSignalLabel(labels, side) {
      const source = labels.join(' ').toLowerCase()
      const direction = side === 'buy' ? 'L' : side === 'sell' ? 'S' : 'N'
      const kind = /(reversal|rever|反转|反轉)/.test(source)
        ? 'REV'
        : /(trend|趋势|趨勢)/.test(source)
          ? 'TRD'
          : 'SIG'
      return `${direction}·${kind}${labels.length > 1 ? `+${labels.length - 1}` : ''}`
    },
    signalSide(signal) {
      const text = `${signal?.side || ''} ${signal?.type || ''} ${signal?.text || ''}`.toLowerCase()
      if (/(buy|long|bull|enter|买|做多|多头|多頭)/.test(text)) return 'buy'
      if (/(sell|short|bear|exit|卖|做空|空头|空頭)/.test(text)) return 'sell'
      return 'neutral'
    },
    formatSignalTime(value) {
      if (!value) return '--'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
    },
    formatPrice(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      return number.toLocaleString(undefined, { maximumFractionDigits: 8 })
    },
    formatAxisPrice(value) {
      const number = Number(value)
      if (!Number.isFinite(number)) return '--'
      if (Math.abs(number) >= 1000) return number.toLocaleString(undefined, { maximumFractionDigits: 0 })
      if (Math.abs(number) >= 1) return number.toFixed(2)
      return number.toFixed(4)
    },
    formatAxisTime(value) {
      if (value === null || value === undefined || value === '') return '--'
      const numeric = Number(value)
      const date = Number.isFinite(numeric)
        ? new Date(numeric * (numeric < 1e12 ? 1000 : 1))
        : new Date(value)
      if (Number.isNaN(date.getTime())) return String(value).slice(0, 10)
      return date.toLocaleString([], { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    },
    candleTime(candle) {
      return this.formatAxisTime(candle?.time || candle?.timestamp || candle?.open_time)
    },
    candleValue(candle, key) {
      if (!candle) return '--'
      if (key === 'volume') {
        const volume = Number(candle.volume ?? candle.vol ?? candle.quote_volume)
        if (!Number.isFinite(volume)) return '--'
        return volume.toLocaleString(undefined, { maximumFractionDigits: 2 })
      }
      return this.formatPrice(candle[key])
    },
    resetChartView() {
      const total = this.rawCandles.length
      this.visibleBars = Math.min(DEFAULT_VISIBLE_BARS, Math.max(total, MIN_VISIBLE_BARS))
      this.viewEnd = total
      this.selectedCandleIndex = null
      this.dragState = null
    },
    zoomChart(direction) {
      const total = this.rawCandles.length
      if (!total) return
      const step = this.visibleBars > 60 ? 16 : 8
      const next = direction > 0 ? this.visibleBars + step : this.visibleBars - step
      this.visibleBars = Math.max(MIN_VISIBLE_BARS, Math.min(MAX_VISIBLE_BARS, total, next))
      this.viewEnd = Math.max(this.visibleBars, Math.min(this.viewEndIndex, total))
      this.selectedCandleIndex = null
    },
    onChartWheel(event) {
      this.zoomChart(event.deltaY > 0 ? 1 : -1)
    },
    onChartPointerDown(event) {
      if (!this.candles.length) return
      event.currentTarget?.setPointerCapture?.(event.pointerId)
      this.dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startEnd: this.viewEndIndex,
        moved: false
      }
    },
    onChartPointerMove(event) {
      if (!this.dragState || this.dragState.pointerId !== event.pointerId) return
      const dx = event.clientX - this.dragState.startX
      if (Math.abs(dx) > 4) this.dragState.moved = true
      const rect = event.currentTarget?.getBoundingClientRect?.()
      const width = Number(rect?.width || 360)
      const plotWidth = width * ((CHART_RIGHT - CHART_LEFT) / 360)
      const pixelsPerBar = plotWidth / Math.max(this.candles.length, 1)
      const barDelta = Math.round(-dx / Math.max(pixelsPerBar, 2))
      const total = this.rawCandles.length
      this.viewEnd = Math.max(this.visibleBars, Math.min(total, this.dragState.startEnd + barDelta))
      if (this.dragState.moved) this.selectedCandleIndex = null
    },
    onChartPointerUp(event) {
      if (!this.dragState || this.dragState.pointerId !== event.pointerId) return
      if (!this.dragState.moved) this.selectCandleAt(event)
      event.currentTarget?.releasePointerCapture?.(event.pointerId)
      this.dragState = null
    },
    onChartPointerCancel(event) {
      event.currentTarget?.releasePointerCapture?.(event.pointerId)
      this.dragState = null
    },
    selectCandleAt(event) {
      const rect = event.currentTarget?.getBoundingClientRect?.()
      if (!rect?.width || !this.candles.length) return
      const svgX = (event.clientX - rect.left) / rect.width * 360
      const ratio = (svgX - CHART_LEFT) / (CHART_RIGHT - CHART_LEFT)
      const index = Math.max(0, Math.min(this.candles.length - 1, Math.floor(ratio * this.candles.length)))
      this.selectedCandleIndex = index
    }
  }
}
</script>

<style scoped>
.indicator-chart-page {
  min-height: 100vh;
  padding-bottom: calc(30px + env(safe-area-inset-bottom));
  background: var(--bg);
}
.control-card,
.chart-card,
.parameter-card,
.latest-card {
  margin: 10px var(--page-gutter) 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-sm);
}
.latest-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 10px;
  background: var(--primary);
  color: #fff;
  font-size: 21px;
}
.control-card { overflow: hidden; }
.selector {
  display: grid;
  grid-template-columns: 74px minmax(0, 1fr) auto auto;
  align-items: center;
  width: 100%;
  min-height: 52px;
  padding: 0 10px;
  border: 0;
  border-bottom: 1px solid var(--border);
  background: transparent;
  color: var(--text-1);
  text-align: left;
}
.selector span, .selector small { color: var(--text-3); font-size: 12px; }
.selector strong { overflow: hidden; font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.selector small { margin-right: 8px; }
.timeframes { display: flex; gap: 7px; padding: 12px; overflow-x: auto; }
.timeframes button {
  flex: 1 0 48px;
  min-height: 32px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-raised);
  color: var(--text-2);
  font-weight: 700;
}
.timeframes button.active { border-color: var(--primary); background: var(--primary); color: #fff; }
.chart-card { padding: 12px 10px; }
.chart-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.chart-copy { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.quote-row { display: flex; align-items: baseline; gap: 7px; min-width: 0; }
.chart-head strong { color: var(--text-1); font-size: 17px; }
.quote-row b { color: var(--text-1); font-size: 14px; }
.quote-row em { font-size: 11px; font-style: normal; font-weight: 800; }
.quote-row em.up { color: var(--up); }
.quote-row em.down { color: var(--down); }
.chart-head span { color: var(--text-3); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chart-head small { color: var(--text-3); font-size: 10px; }
.chart-head button {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-raised);
  color: var(--text-2);
}
.chart-toolbar {
  min-height: 42px;
  margin: 2px 0 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.window-status {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-3);
  font-size: 10px;
}
.window-status span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.window-status small {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: var(--surface-raised);
  font-size: 9px;
}
.zoom-controls { display: flex; align-items: center; gap: 5px; flex: 0 0 auto; }
.zoom-controls button {
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-raised);
  color: var(--text-2);
  font-size: 10px;
  font-weight: 800;
}
.zoom-controls button.active { border-color: color-mix(in srgb, var(--primary) 42%, var(--border)); color: var(--primary); }
.chart-state { min-height: 270px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; color: var(--text-3); font-size: 13px; text-align: center; }
.chart-state.error { color: var(--down); }
.svg-wrap { width: 100%; overflow: hidden; cursor: crosshair; user-select: none; }
.svg-wrap.dragging { cursor: grabbing; }
.signal-chart {
  display: block;
  width: 100%;
  height: auto;
  min-height: 260px;
  touch-action: pan-y;
}
.grid line { stroke: var(--border); stroke-width: .6; stroke-dasharray: 3 5; }
.axis-labels text {
  fill: var(--text-3);
  font-size: 7.5px;
  paint-order: stroke;
  stroke: var(--surface);
  stroke-width: 2px;
}
.up-stroke { stroke: var(--up); stroke-width: 1; }
.down-stroke { stroke: var(--down); stroke-width: 1; }
.up-fill { fill: var(--up); }
.down-fill { fill: var(--down); }
.crosshair line {
  stroke: color-mix(in srgb, var(--text-2) 62%, transparent);
  stroke-width: .7;
  stroke-dasharray: 3 3;
  pointer-events: none;
}
.crosshair circle { fill: var(--surface); stroke: var(--primary); stroke-width: 1.5; pointer-events: none; }
.volume-pane text { fill: var(--text-3); font-size: 7px; font-weight: 800; }
.volume-pane .volume-up { fill: color-mix(in srgb, var(--up) 32%, transparent); }
.volume-pane .volume-down { fill: color-mix(in srgb, var(--down) 32%, transparent); }
.signal-marker text { fill: var(--text-2); font-size: 7px; font-weight: 800; paint-order: stroke; stroke: var(--surface); stroke-width: 2px; }
.candle-inspector {
  margin-top: 4px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface-raised);
}
.inspector-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.inspector-head span { color: var(--text-3); font-size: 10px; }
.inspector-head strong { color: var(--text-2); font-size: 11px; }
.ohlcv-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 7px;
  margin-top: 8px;
}
.ohlcv-grid div { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ohlcv-grid span { color: var(--text-3); font-size: 9px; }
.ohlcv-grid strong {
  overflow: hidden;
  color: var(--text-1);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.inspector-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 8px;
}
.inspector-signals span {
  max-width: 100%;
  padding: 3px 7px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--surface);
  color: var(--text-2);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.legend { display: flex; flex-wrap: wrap; gap: 7px 12px; min-height: 18px; margin-top: 4px; }
.legend span { display: inline-flex; align-items: center; gap: 5px; color: var(--text-3); font-size: 10px; }
.legend i { width: 11px; height: 3px; border-radius: 2px; }
.latest-card { display: flex; align-items: center; gap: 12px; padding: 14px; }
.latest-card .latest-icon { width: 38px; height: 38px; font-size: 18px; }
.latest-card.buy .latest-icon { background: var(--up); }
.latest-card.sell .latest-icon { background: var(--down); }
.latest-card.neutral .latest-icon { background: var(--surface-raised); color: var(--text-3); }
.latest-card > div:last-child { display: flex; flex-direction: column; gap: 2px; }
.latest-card span, .latest-card small { color: var(--text-3); font-size: 11px; }
.latest-card strong { color: var(--text-1); font-size: 15px; }
.parameter-card { padding: 0; overflow: hidden; }
.parameter-card > summary { padding: 13px 14px; list-style: none; cursor: pointer; }
.parameter-card > summary::-webkit-details-marker { display: none; }
.parameter-card > summary .section-title { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.parameter-card[open] > summary .van-icon { transform: rotate(180deg); }
.parameter-card > summary .van-icon { color: var(--text-3); transition: transform .18s ease; }
.parameter-content { padding: 0 14px 14px; border-top: 1px solid var(--hairline); }
.section-title strong { display: block; color: var(--text-1); font-size: 15px; }
.section-title span { display: block; margin-top: 3px; color: var(--text-3); font-size: 11px; }
.parameter-row { display: flex; align-items: center; gap: 12px; min-height: 54px; border-bottom: 1px solid var(--border); }
.parameter-row > div:first-child { min-width: 100px; display: flex; flex-direction: column; }
.parameter-row strong { color: var(--text-2); font-size: 13px; }
.parameter-row span { color: var(--text-3); font-size: 10px; }
.parameter-row :deep(.van-field) { padding-right: 0; background: transparent; }
.parameter-content > .van-button { margin-top: 14px; border-radius: 8px; }
.read-only-hint { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 14px 24px 0; color: var(--text-3); font-size: 11px; text-align: center; }
</style>
