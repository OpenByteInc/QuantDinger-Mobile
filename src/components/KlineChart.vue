<template>
  <div class="kline-chart">
    <!-- Header -->
    <div class="chart-header">
      <div class="hdr-left">
        <span class="sym-symbol">{{ symbol || '-' }}</span>
        <div class="price-row">
          <span :class="['sym-price', priceClass]">{{ displayPrice }}</span>
          <span v-if="displayChange !== null" :class="['sym-change', priceClass]">
            <span class="chg-arrow">{{ priceClass === 'down' ? '▼' : '▲' }}</span>
            {{ displayChangeAbs }} ({{ displayChange }})
          </span>
        </div>
        <span class="hdr-meta">
          <span v-if="hoveredPoint" class="hdr-time">{{ formatTooltipTime(hoveredPoint.time) }}</span>
          <span v-else class="hdr-hint">{{ tfHint }}</span>
        </span>
      </div>
    </div>

    <!-- Chart -->
    <div ref="chartEl" class="chart-wrap" :style="{ height: `${height}px` }">
      <svg
        v-if="points.length > 1"
        class="chart-svg"
        :viewBox="`0 0 ${viewWidth} ${viewHeight}`"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient :id="gradId" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" :stop-color="strokeColor" stop-opacity="0.32" />
            <stop offset="55%" :stop-color="strokeColor" stop-opacity="0.08" />
            <stop offset="100%" :stop-color="strokeColor" stop-opacity="0" />
          </linearGradient>
          <filter :id="glowId" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="1.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <!-- baseline (first price) -->
        <line
          v-if="baselineY !== null"
          class="baseline"
          :x1="0"
          :x2="viewWidth"
          :y1="baselineY"
          :y2="baselineY"
        />

        <!-- gradient area under curve -->
        <path :d="areaPath" :fill="`url(#${gradId})`" />

        <!-- main curve -->
        <path
          class="curve"
          :d="linePath"
          :stroke="strokeColor"
          fill="none"
          stroke-width="1.6"
          stroke-linejoin="round"
          stroke-linecap="round"
          :filter="`url(#${glowId})`"
        />

        <!-- last point dot -->
        <circle
          v-if="lastPoint"
          class="last-dot"
          :cx="lastPoint.x"
          :cy="lastPoint.y"
          r="3"
          :fill="strokeColor"
          stroke="#0a0a0c"
          stroke-width="1.2"
        />

        <!-- hover crosshair + dot -->
        <g v-if="hoveredPoint">
          <line
            class="cross-v"
            :x1="hoveredPoint.x"
            :x2="hoveredPoint.x"
            :y1="0"
            :y2="viewHeight"
          />
          <circle
            :cx="hoveredPoint.x"
            :cy="hoveredPoint.y"
            r="4"
            :fill="strokeColor"
            stroke="#fff"
            stroke-width="1.5"
          />
        </g>
      </svg>

      <!-- Time axis -->
      <div v-if="points.length > 1" class="time-axis">
        <span v-for="(t, i) in timeTicks" :key="i" class="tick">{{ t }}</span>
      </div>

      <!-- Tooltip bubble for hovered price (floating beside cursor) -->
      <div
        v-if="hoveredPoint"
        class="hover-bubble"
        :style="hoverBubbleStyle"
      >
        {{ formatPrice(hoveredPoint.value) }}
      </div>

      <!-- Touch / mouse overlay -->
      <div
        class="touch-overlay"
        @touchstart.passive="onTouch"
        @touchmove.passive="onTouch"
        @touchend="onTouchEnd"
        @touchcancel="onTouchEnd"
        @mousedown="onMouseDown"
        @mousemove="onMouseMove"
        @mouseleave="onTouchEnd"
        @mouseup="onMouseUp"
      ></div>

      <van-loading v-if="loading" color="#7c5cff" size="20" class="chart-loading" />
      <div v-else-if="!points.length" class="chart-empty">
        <van-icon name="chart-trending-o" />
        <span>{{ emptyText || $t('common.no_data') }}</span>
      </div>
    </div>

    <!-- Timeframe segmented control -->
    <div class="tf-tabs">
      <div
        v-for="tf in timeframes"
        :key="tf.value"
        :class="['tf-tab', { active: tf.value === currentTf }]"
        @click="onTfChange(tf.value)"
      >{{ tf.label }}</div>
    </div>
  </div>
</template>

<script>
import { klineApi } from '@/api'

let uid = 0

export default {
  name: 'KlineChart',
  props: {
    market: { type: String, default: 'Crypto' },
    symbol: { type: String, default: '' },
    defaultTimeframe: { type: String, default: '1h' },
    height: { type: Number, default: 220 },
    emptyText: { type: String, default: '' }
  },
  data() {
    uid += 1
    return {
      _uid: uid,
      currentTf: this.defaultTimeframe,
      candles: [],
      loading: false,
      resizeObserver: null,
      containerWidth: 360,
      viewHeight: 150,
      paddingTop: 22,
      paddingBottom: 18,
      paddingLeft: 4,
      paddingRight: 4,
      hoveredIndex: -1,
      isDragging: false
    }
  },
  computed: {
    gradId() { return `kline-grad-${this._uid}` },
    glowId() { return `kline-glow-${this._uid}` },
    timeframes() {
      return [
        { value: '5m', label: '5m' },
        { value: '15m', label: '15m' },
        { value: '1h', label: '1H' },
        { value: '4h', label: '4H' },
        { value: '1d', label: '1D' }
      ]
    },
    viewWidth() {
      return Math.max(280, this.containerWidth)
    },
    innerWidth() {
      return this.viewWidth - this.paddingLeft - this.paddingRight
    },
    innerHeight() {
      return this.viewHeight - this.paddingTop - this.paddingBottom
    },
    priceSeries() {
      return this.candles.map((c) => ({ time: c.time, value: c.close }))
    },
    minMax() {
      if (!this.priceSeries.length) return { min: 0, max: 1 }
      let min = Infinity
      let max = -Infinity
      for (const p of this.priceSeries) {
        if (p.value < min) min = p.value
        if (p.value > max) max = p.value
      }
      const pad = (max - min) * 0.08 || Math.abs(max) * 0.002 || 1
      return { min: min - pad, max: max + pad }
    },
    points() {
      const series = this.priceSeries
      if (series.length < 2) return []
      const { min, max } = this.minMax
      const span = max - min || 1
      const step = this.innerWidth / (series.length - 1)
      return series.map((p, i) => ({
        index: i,
        time: p.time,
        value: p.value,
        x: this.paddingLeft + i * step,
        y: this.paddingTop + this.innerHeight - ((p.value - min) / span) * this.innerHeight
      }))
    },
    baselineY() {
      if (!this.points.length) return null
      const firstValue = this.points[0].value
      const { min, max } = this.minMax
      const span = max - min || 1
      return this.paddingTop + this.innerHeight - ((firstValue - min) / span) * this.innerHeight
    },
    firstPrice() {
      return this.points.length ? this.points[0].value : null
    },
    lastPrice() {
      return this.points.length ? this.points[this.points.length - 1].value : null
    },
    lastPoint() {
      return this.points.length ? this.points[this.points.length - 1] : null
    },
    changePct() {
      if (this.firstPrice === null || this.lastPrice === null || this.firstPrice === 0) return null
      return ((this.lastPrice - this.firstPrice) / this.firstPrice) * 100
    },
    priceClass() {
      if (this.changePct === null) return 'up'
      return this.changePct >= 0 ? 'up' : 'down'
    },
    strokeColor() {
      return this.priceClass === 'down' ? '#ff5f57' : '#34c759'
    },
    hoveredPoint() {
      if (this.hoveredIndex < 0 || this.hoveredIndex >= this.points.length) return null
      return this.points[this.hoveredIndex]
    },
    displayPrice() {
      const v = this.hoveredPoint ? this.hoveredPoint.value : this.lastPrice
      if (v === null || v === undefined) return '--'
      return this.formatPrice(v)
    },
    displayChange() {
      if (!this.points.length) return null
      const anchor = this.firstPrice
      const target = this.hoveredPoint ? this.hoveredPoint.value : this.lastPrice
      if (anchor === null || target === null || anchor === 0) return null
      const pct = ((target - anchor) / anchor) * 100
      const sign = pct >= 0 ? '+' : ''
      return `${sign}${pct.toFixed(2)}%`
    },
    displayChangeAbs() {
      if (!this.points.length) return ''
      const anchor = this.firstPrice
      const target = this.hoveredPoint ? this.hoveredPoint.value : this.lastPrice
      if (anchor === null || target === null) return ''
      const diff = target - anchor
      const sign = diff >= 0 ? '+' : ''
      return `${sign}${this.formatPrice(Math.abs(diff))}`
    },
    tfHint() {
      const map = { '5m': 'Last 1000 min', '15m': 'Last 50h', '1h': 'Last ~8 days', '4h': 'Last ~33 days', '1d': 'Last 200 days' }
      return map[this.currentTf] || ''
    },
    linePath() {
      return this.buildMonotonePath(this.points)
    },
    areaPath() {
      if (!this.points.length) return ''
      const baseY = this.paddingTop + this.innerHeight
      const first = this.points[0]
      const last = this.points[this.points.length - 1]
      return `M${first.x.toFixed(2)},${baseY.toFixed(2)} L${first.x.toFixed(2)},${first.y.toFixed(2)} ${this.buildMonotonePath(this.points, true)} L${last.x.toFixed(2)},${baseY.toFixed(2)} Z`
    },
    timeTicks() {
      if (this.points.length < 2) return []
      const count = Math.min(5, this.points.length)
      const labels = []
      for (let i = 0; i < count; i += 1) {
        const idx = Math.round(((this.points.length - 1) * i) / (count - 1))
        labels.push(this.formatAxisTime(this.points[idx].time))
      }
      return labels
    },
    hoverBubbleStyle() {
      if (!this.hoveredPoint) return { display: 'none' }
      const px = (this.hoveredPoint.x / this.viewWidth) * 100
      const py = (this.hoveredPoint.y / this.viewHeight) * 100
      return {
        left: `${px}%`,
        top: `${py}%`
      }
    }
  },
  watch: {
    symbol() { this.fetchData() },
    market() { this.fetchData() }
  },
  mounted() {
    this.observeResize()
    this.fetchData()
  },
  beforeUnmount() {
    try { this.resizeObserver?.disconnect() } catch (e) { void 0 }
  },
  methods: {
    observeResize() {
      const el = this.$refs.chartEl
      if (!el) return
      this.containerWidth = el.clientWidth || 360
      this.resizeObserver = new ResizeObserver(() => {
        this.containerWidth = el.clientWidth || 360
      })
      this.resizeObserver.observe(el)
    },
    onTfChange(tf) {
      if (tf === this.currentTf) return
      this.currentTf = tf
      this.hoveredIndex = -1
      this.fetchData()
    },
    async fetchData() {
      if (!this.symbol) return
      this.loading = true
      try {
        const res = await klineApi.getKline({
          market: this.market || 'Crypto',
          symbol: this.symbol,
          timeframe: this.mapTf(this.currentTf),
          limit: 200
        })
        const list = (res?.data || []).map((k) => ({
          time: Math.floor(Number(k.time || k.timestamp || 0) / (Number(k.time || k.timestamp || 0) > 1e12 ? 1000 : 1)),
          open: Number(k.open),
          high: Number(k.high),
          low: Number(k.low),
          close: Number(k.close)
        })).filter((k) => k.time && Number.isFinite(k.close))
          .sort((a, b) => a.time - b.time)
        this.candles = list
      } catch (e) {
        this.candles = []
      } finally {
        this.loading = false
      }
    },
    mapTf(tf) {
      const map = { '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m', '1h': '1H', '2h': '2H', '4h': '4H', '1d': '1D', '1w': '1W' }
      return map[tf] || tf
    },
    // --- Monotone cubic smoothing ---
    buildMonotonePath(points, omitMove = false) {
      if (points.length < 2) return ''
      const n = points.length
      const dx = new Array(n - 1)
      const dy = new Array(n - 1)
      const d = new Array(n - 1)
      for (let i = 0; i < n - 1; i += 1) {
        dx[i] = points[i + 1].x - points[i].x
        dy[i] = points[i + 1].y - points[i].y
        d[i] = dx[i] === 0 ? 0 : dy[i] / dx[i]
      }
      const m = new Array(n)
      m[0] = d[0]
      m[n - 1] = d[n - 2]
      for (let i = 1; i < n - 1; i += 1) {
        if (d[i - 1] * d[i] <= 0) m[i] = 0
        else m[i] = (d[i - 1] + d[i]) / 2
      }
      for (let i = 0; i < n - 1; i += 1) {
        if (d[i] === 0) {
          m[i] = 0
          m[i + 1] = 0
        } else {
          const a = m[i] / d[i]
          const b = m[i + 1] / d[i]
          const s = a * a + b * b
          if (s > 9) {
            const t = 3 / Math.sqrt(s)
            m[i] = t * a * d[i]
            m[i + 1] = t * b * d[i]
          }
        }
      }
      let path = omitMove ? '' : `M${points[0].x.toFixed(2)},${points[0].y.toFixed(2)}`
      for (let i = 0; i < n - 1; i += 1) {
        const h = dx[i]
        const cp1x = points[i].x + h / 3
        const cp1y = points[i].y + (m[i] * h) / 3
        const cp2x = points[i + 1].x - h / 3
        const cp2y = points[i + 1].y - (m[i + 1] * h) / 3
        path += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${points[i + 1].x.toFixed(2)},${points[i + 1].y.toFixed(2)}`
      }
      return path
    },
    // --- Touch / mouse tracking ---
    onTouch(event) {
      const t = event.touches && event.touches[0]
      if (!t) return
      this.updateHoverFromClientX(t.clientX)
    },
    onTouchEnd() {
      this.hoveredIndex = -1
      this.isDragging = false
    },
    onMouseDown(event) {
      this.isDragging = true
      this.updateHoverFromClientX(event.clientX)
    },
    onMouseMove(event) {
      if (!this.isDragging) return
      this.updateHoverFromClientX(event.clientX)
    },
    onMouseUp() {
      this.isDragging = false
      this.hoveredIndex = -1
    },
    updateHoverFromClientX(clientX) {
      if (!this.points.length) return
      const el = this.$refs.chartEl
      if (!el) return
      const rect = el.getBoundingClientRect()
      const svgX = ((clientX - rect.left) / rect.width) * this.viewWidth
      const first = this.points[0].x
      const last = this.points[this.points.length - 1].x
      const range = last - first || 1
      const pct = Math.max(0, Math.min(1, (svgX - first) / range))
      const idx = Math.round(pct * (this.points.length - 1))
      if (idx !== this.hoveredIndex) this.hoveredIndex = idx
    },
    // --- Formatting ---
    formatPrice(value) {
      const num = Number(value)
      if (!Number.isFinite(num)) return '-'
      if (num >= 10000) return num.toLocaleString('en-US', { maximumFractionDigits: 2 })
      if (num >= 1) return num.toFixed(num >= 100 ? 2 : 4)
      if (num >= 0.01) return num.toFixed(4)
      return num.toFixed(6)
    },
    formatAxisTime(ts) {
      const d = new Date(ts * 1000)
      if (Number.isNaN(d.getTime())) return ''
      const tf = this.currentTf
      if (tf === '1d') {
        return `${d.getMonth() + 1}/${d.getDate()}`
      }
      if (tf === '4h' || tf === '1h') {
        return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:00`
      }
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    },
    formatTooltipTime(ts) {
      const d = new Date(ts * 1000)
      if (Number.isNaN(d.getTime())) return ''
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${month}/${day} ${hh}:${mm}`
    }
  }
}
</script>

<style scoped>
.kline-chart {
  background: var(--surface-glass);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 18px 16px 14px;
  color: var(--text);
  backdrop-filter: blur(22px);
  -webkit-backdrop-filter: blur(22px);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 10px;
}
.hdr-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.sym-symbol {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--text-2);
  text-transform: uppercase;
}
.price-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}
.sym-price {
  font-size: 28px;
  font-weight: 800;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
  color: var(--text);
  line-height: 1.1;
  transition: color 0.15s ease;
}
.sym-price.up,
.sym-price.down { color: var(--text); }
.sym-change {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 2px 0;
}
.sym-change.up { color: var(--up); }
.sym-change.down { color: var(--down); }
.chg-arrow {
  font-size: 9px;
  opacity: 0.85;
}
.hdr-meta {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
.hdr-time {
  color: var(--text-2);
  font-weight: 600;
}

.chart-wrap {
  position: relative;
  width: 100%;
}
.chart-svg {
  width: 100%;
  height: 100%;
  display: block;
  overflow: visible;
}

.baseline {
  stroke: var(--border);
  stroke-width: 1;
  stroke-dasharray: 3 4;
}
.cross-v {
  stroke: var(--border-strong);
  stroke-width: 1;
  stroke-dasharray: 2 3;
  pointer-events: none;
}

.time-axis {
  display: flex;
  justify-content: space-between;
  padding: 14px 2px 0;
  font-size: 10px;
  color: var(--text-3);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
}

.hover-bubble {
  position: absolute;
  transform: translate(-50%, -140%);
  padding: 4px 10px;
  border-radius: 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  white-space: nowrap;
  box-shadow: var(--shadow-pop);
}

.touch-overlay {
  position: absolute;
  inset: 0;
  touch-action: pan-y;
  cursor: crosshair;
}

.chart-loading,
.chart-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-3);
  font-size: 12px;
  flex-direction: column;
}
.chart-empty .van-icon {
  font-size: 28px;
  color: var(--text-4);
}

.tf-tabs {
  margin-top: 22px;
  display: flex;
  background: var(--surface-deep);
  border-radius: 12px;
  padding: 3px;
  gap: 2px;
}
.tf-tab {
  flex: 1;
  text-align: center;
  padding: 7px 0;
  font-size: 12px;
  font-weight: 700;
  color: var(--text-2);
  border-radius: 10px;
  transition: all 0.2s ease;
  letter-spacing: 0.02em;
  user-select: none;
}
.tf-tab.active {
  background: var(--surface-raised);
  color: var(--text);
  box-shadow: var(--shadow-card);
}
</style>
