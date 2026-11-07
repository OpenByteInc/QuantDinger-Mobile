<template>
  <figure class="research-chart" role="img" :aria-label="label">
    <div ref="canvas" class="research-chart__canvas"></div>
  </figure>
</template>

<script>
import { markRaw } from 'vue'
import { buildResearchChartOption } from '@/utils/researchCharts.mjs'

let echartsRuntimePromise
const loadEcharts = () => {
  if (!echartsRuntimePromise) {
    echartsRuntimePromise = import('@/utils/mobileEcharts.mjs').then(module => module.default)
  }
  return echartsRuntimePromise
}

export default {
  name: 'ResearchChart',
  props: {
    spec: { type: Object, required: true },
    label: { type: String, default: '' }
  },
  data() {
    return {
      chart: null,
      resizeObserver: null,
      disposed: false
    }
  },
  watch: {
    spec: {
      deep: true,
      handler() {
        this.$nextTick(this.renderChart)
      }
    }
  },
  mounted() {
    this.renderChart()
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.chart?.resize())
      this.resizeObserver.observe(this.$el)
    } else {
      window.addEventListener('resize', this.resizeChart)
    }
  },
  beforeUnmount() {
    this.disposed = true
    this.resizeObserver?.disconnect()
    window.removeEventListener('resize', this.resizeChart)
    this.chart?.dispose()
    this.chart = null
  },
  methods: {
    resizeChart() {
      this.chart?.resize()
    },
    palette() {
      const styles = window.getComputedStyle(this.$el)
      const read = (name, fallback) => styles.getPropertyValue(name).trim() || fallback
      return {
        accent: read('--accent', '#0f6f4f'),
        text: read('--text', '#182018'),
        muted: read('--text-2', '#70766c'),
        border: read('--border', 'rgba(24, 32, 24, 0.14)'),
        tooltip: read('--surface', '#fffdf7')
      }
    },
    async renderChart() {
      if (!this.$refs.canvas || !this.spec) return
      const echarts = await loadEcharts()
      if (this.disposed || !this.$refs.canvas) return
      if (!this.chart) this.chart = markRaw(echarts.init(this.$refs.canvas, null, { renderer: 'canvas' }))
      this.chart.setOption(buildResearchChartOption(this.spec, this.palette()), true)
      this.chart.resize()
    }
  }
}
</script>

<style scoped>
.research-chart {
  margin: 10px 0;
  padding: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
}

.research-chart__canvas {
  width: 100%;
  height: 248px;
}

@media (max-width: 430px) {
  .research-chart__canvas {
    height: 224px;
  }
}
</style>
