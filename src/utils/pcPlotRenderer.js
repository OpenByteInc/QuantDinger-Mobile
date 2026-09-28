// Shared rendering behavior ported from the PC KlineChart r14 implementation.
export function createPlotRenderer(chartTheme) {
const LAMP_FIGURE_TYPES = ['lamp', 'dot', 'point', 'scatter', 'circle']
const getIndicatorColor = index => ['#e5a100','#3e7bfa','#a278e8','#0cad88'][index % 4]
    const normalizeCustomFigureType = (type) => {
      const rawType = String(type || 'line').toLowerCase()
      if (LAMP_FIGURE_TYPES.includes(rawType)) return 'circle'
      if (['histogram', 'column'].includes(rawType)) return 'bar'
      if (['circle', 'bar', 'line'].includes(rawType)) return rawType
      return 'line'
    }

    const toPositiveNumber = (value, fallback) => {
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
    }

    const getPlotPointValue = (point) => {
      if (point && typeof point === 'object') {
        const value = point.value ?? point.y ?? point.data
        return value == null ? null : value
      }
      return point
    }

    const getPlotPointColor = (point) => {
      if (point && typeof point === 'object') {
        return point.color || point.fillColor || point.backgroundColor || null
      }
      return null
    }

    const getPlotPointSize = (point) => {
      if (point && typeof point === 'object') {
        const size = Number(point.size ?? point.radius ?? point.r)
        return Number.isFinite(size) && size > 0 ? size : null
      }
      return null
    }

    const isTruthyLampValue = (value) => {
      if (value == null) return false
      if (typeof value === 'boolean') return value
      if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (!normalized || ['0', 'false', 'off', 'nan', 'none', 'null'].includes(normalized)) return false
        return true
      }
      const numeric = Number(value)
      return Number.isFinite(numeric) && numeric !== 0
    }

    const normalizePlotDataSeries = (data, options = {}) => {
      if (!Array.isArray(data)) return []
      if (options.forceLamp) {
        const lane = Number(options.lampLane)
        const fallbackLane = Number.isFinite(lane) && lane > 0 ? lane : 1
        return data.map(point => {
          const value = getPlotPointValue(point)
          return isTruthyLampValue(value) ? fallbackLane : null
        })
      }
      return data.map(getPlotPointValue)
    }

    const getKLineTimeKey = (item) => {
      const raw = Number(item?.timestamp ?? item?.time)
      if (!Number.isFinite(raw)) return null
      return raw > 1e10 ? Math.floor(raw / 1000) : Math.floor(raw)
    }

    const buildAlignedPlotRows = (sourceData, plotDataMap, targetData) => {
      const sourceRows = Array.isArray(sourceData) ? sourceData : []
      const targetRows = Array.isArray(targetData) ? targetData : []
      const sourceIndexByTime = new Map()

      sourceRows.forEach((item, index) => {
        const timeKey = getKLineTimeKey(item)
        if (timeKey !== null) {
          sourceIndexByTime.set(timeKey, index)
        }
      })

      return targetRows.map((item, fallbackIndex) => {
        const timeKey = getKLineTimeKey(item)
        const sourceIndex = timeKey !== null && sourceIndexByTime.has(timeKey)
          ? sourceIndexByTime.get(timeKey)
          : fallbackIndex
        const dataPoint = {}
        for (const figureKey in plotDataMap) {
          const plotData = plotDataMap[figureKey]
          dataPoint[figureKey] = sourceIndex >= 0 && sourceIndex < plotData.length
            ? plotData[sourceIndex]
            : null
        }
        return dataPoint
      })
    }

    const extractPlotColorSeries = (data) => {
      if (!Array.isArray(data)) return []
      return data.map(getPlotPointColor)
    }

    const extractPlotSizeSeries = (data) => {
      if (!Array.isArray(data)) return []
      return data.map(getPlotPointSize)
    }

    const isLampType = (type) => LAMP_FIGURE_TYPES.includes(String(type || '').toLowerCase())

    const looksLikeLampPlot = (plot) => {
      if (!plot) return false
      if (isLampType(plot.type)) return true
      const name = String(plot.name || plot.title || '').toLowerCase()
      const lampNamePattern = /(lamp|light|red|green|on|off|bull|bear|signal|state|trend)/
      if (!lampNamePattern.test(name)) return false
      const data = Array.isArray(plot.data) ? plot.data : []
      const sample = data.map(getPlotPointValue).filter(value => value != null).slice(0, 80)
      if (!sample.length) return true
      const numericSample = sample.map(Number).filter(Number.isFinite)
      if (!numericSample.length) return true
      const uniqueValues = new Set(numericSample.map(value => Number(value.toFixed(6))))
      const integerish = numericSample.every(value => Math.abs(value - Math.round(value)) < 1e-6)
      return integerish && uniqueValues.size <= 8
    }

    // Legacy lane parser kept for compatibility reference while v2 handles current lamp belts.
    // eslint-disable-next-line no-unused-vars
    const getLampLaneKey = (plot, plotIdx) => {
      const rawName = String(plot?.name || plot?.title || `lamp_${plotIdx}`)
      const key = rawName
        .replace(/\b(red|green|on|off|bullish|bearish|bull|bear|long|short|up|down|light|lamp)\b/ig, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return key || `lamp_${plotIdx}`
    }

    const isLampSummaryPlot = (plot) => {
      const name = String(plot?.name || plot?.title || '').toLowerCase()
      return /(count|score|total|sum|summary)/.test(name)
    }

    const getLampLaneKeyV2 = (plot, plotIdx) => {
      const explicitLabel = plot?.laneLabel ?? plot?.rowLabel ?? plot?.label ?? plot?.group ?? plot?.laneName
      const rawName = String(explicitLabel || plot?.name || plot?.title || `lamp_${plotIdx}`)
      const key = rawName
        .replace(/\b(red|green|on|off|bullish|bearish|bull|bear|long|short|up|down|light|lamp|buy|sell|entry|exit|signal|signals)\b/ig, '')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      return key || `L${plotIdx + 1}`
    }

    const resolveLampColor = (color, fallback = '#22c55e') => {
      const normalized = String(color || '').toLowerCase()
      if (normalized.includes('ff3b30') || normalized.includes('ef4444') || normalized.includes('red')) return '#ff4d4f'
      if (normalized.includes('35c759') || normalized.includes('22c55e') || normalized.includes('green')) return '#22c55e'
      return color || fallback
    }

    const createLampBeltMeta = (plots) => {
      const laneKeys = []
      const laneKeyByIndex = new Map()

      plots.forEach((plot, plotIdx) => {
        if (!looksLikeLampPlot(plot) || isLampSummaryPlot(plot)) return
        const laneKey = getLampLaneKeyV2(plot, plotIdx)
        laneKeyByIndex.set(plotIdx, laneKey)
        if (!laneKeys.includes(laneKey)) laneKeys.push(laneKey)
      })

      if (laneKeys.length < 3) {
        return { enabled: false, laneByIndex: new Map(), hiddenIndexes: new Set(), laneCount: 0 }
      }

      const laneByIndex = new Map()
      const labelByLane = new Map()
      laneKeyByIndex.forEach((laneKey, plotIdx) => {
        const laneIndex = laneKeys.indexOf(laneKey)
        const lane = laneKeys.length - laneIndex
        laneByIndex.set(plotIdx, lane)
        labelByLane.set(lane, laneKey)
      })

      const hiddenIndexes = new Set()
      plots.forEach((plot, plotIdx) => {
        if (isLampSummaryPlot(plot)) hiddenIndexes.add(plotIdx)
      })

      return { enabled: true, laneByIndex, hiddenIndexes, laneCount: laneKeys.length, labelByLane, laneKeys }
    }

    const buildCustomPlotFigure = (plot, plotIdx, fallbackName, options = {}) => {
      const plotName = plot.name || fallbackName || `PLOT_${plotIdx}`
      const safeKeyBase = String(plotName)
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/^_+|_+$/g, '')
      const figureKey = safeKeyBase || `plot_${plotIdx}`
      const figureType = options.forceLamp ? 'bar' : normalizeCustomFigureType(plot.type)
      const plotColor = plot.color || getIndicatorColor(plotIdx)
      const pointSize = toPositiveNumber(plot.size ?? plot.radius, ['circle'].includes(figureType) ? 5 : 1.5)
      const lineSize = toPositiveNumber(plot.lineWidth ?? plot.size, 1.5)
      const borderSize = toPositiveNumber(plot.borderSize, 1)
      const styleColor = plotColor
      const colorKey = `${figureKey}__color`
      const sizeKey = `${figureKey}__size`
      const resolveRuntimeStyle = (indicatorData = {}) => {
        const runtimeColor = indicatorData[colorKey] || styleColor
        const runtimeSize = toPositiveNumber(indicatorData[sizeKey], pointSize)
        const style = {
          color: runtimeColor
        }
        const opacity = Number(plot.opacity)
        if (Number.isFinite(opacity)) {
          style.opacity = opacity
        }
        return { style, runtimeColor, runtimeSize }
      }

      const figure = {
        key: figureKey,
        title: options.forceLamp ? '' : (plot.title === false ? '' : (plot.title || plot.name || plotName)),
        type: figureType,
        lamp: options.forceLamp
          ? {
              lane: options.lampLane,
              label: getLampLaneKeyV2(plot, plotIdx),
              color: resolveLampColor(plotColor),
              size: pointSize
            }
          : null,
        styles: (data) => {
          const indicatorData = data?.current?.indicatorData || {}
          const { style: commonStyle, runtimeColor, runtimeSize } = resolveRuntimeStyle(indicatorData)

          if (figureType === 'circle') {
            return {
              ...commonStyle,
              borderColor: plot.borderColor || runtimeColor,
              borderSize,
              r: runtimeSize,
              radius: runtimeSize
            }
          }

          if (figureType === 'bar') {
            return {
              ...commonStyle,
              style: options.forceLamp ? 'fill' : commonStyle.style,
              borderColor: plot.borderColor || runtimeColor,
              borderSize: options.forceLamp ? 0 : borderSize
            }
          }

          return {
            ...commonStyle,
            size: lineSize,
            style: plot.lineStyle || plot.style || 'solid'
          }
        }
      }

      if (figureType === 'circle') {
        figure.attrs = ({ coordinate, data }) => {
          const indicatorData = data?.current || {}
          const { runtimeSize } = resolveRuntimeStyle(indicatorData)
          const currentCoordinate = coordinate?.current || {}
          return {
            x: currentCoordinate.x,
            y: currentCoordinate[figureKey],
            r: runtimeSize
          }
        }
      }

      if (options.forceLamp && figureType === 'bar') {
        figure.attrs = ({ coordinate, data, barSpace, bounding }) => {
          const indicatorData = data?.current || {}
          const currentCoordinate = coordinate?.current || {}
          const runtimeSize = toPositiveNumber(indicatorData[sizeKey], pointSize)
          const baseBarWidth = Number(barSpace?.bar ?? barSpace?.gapBar ?? 8)
          const width = Math.max(3, Math.min(5, (Number.isFinite(baseBarWidth) ? baseBarWidth : 8) * 0.42, runtimeSize * 0.82))
          const height = Math.max(8, Math.min(12, runtimeSize * 2.15))
          const reservedLeft = Number(bounding?.left || 0) + 82
          const x = Number(currentCoordinate.x)
          if (!Number.isFinite(x) || x < reservedLeft) {
            return { x: -9999, y: -9999, width: 0, height: 0 }
          }
          return {
            x: x - width / 2,
            y: currentCoordinate[figureKey] - height / 2,
            width,
            height,
            r: height / 2
          }
        }
      }

      if (figureType === 'bar' && plot.baseValue != null) {
        figure.baseValue = Number(plot.baseValue)
      }

      return { figureKey, figure, colorKey, sizeKey }
    }

    const hasLampStylePlots = (plots, lampBeltMeta = null) => {
      if (lampBeltMeta?.enabled) return true
      return Array.isArray(plots) && plots.some(plot => isLampType(plot?.type))
    }

    const getCustomPaneOptions = (plots, lampBeltMeta = null) => {
      const lampLaneCount = Number(lampBeltMeta?.laneCount || 0)
      const lampHeight = Math.max(170, Math.min(280, 82 + lampLaneCount * 22))
      return {
        height: hasLampStylePlots(plots, lampBeltMeta) ? lampHeight : 100,
        dragEnabled: true
      }
    }

    const drawRoundedRect = (ctx, x, y, width, height, radius) => {
      const r = Math.max(0, Math.min(radius, width / 2, height / 2))
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + width - r, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + r)
      ctx.lineTo(x + width, y + height - r)
      ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
      ctx.lineTo(x + r, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - r)
      ctx.lineTo(x, y + r)
      ctx.quadraticCurveTo(x, y, x + r, y)
      ctx.closePath()
    }

    // Legacy lamp renderer kept for compatibility reference while v2 handles current lamp belts.
    // eslint-disable-next-line no-unused-vars
    const createLampBeltDraw = (lampBeltMeta, displayName) => {
      if (!lampBeltMeta?.enabled) return null
      return ({ ctx, indicator, visibleRange, bounding, barSpace, xAxis, yAxis }) => {
        try {
          const result = indicator.result || []
          const figures = (indicator.figures || []).filter(figure => figure?.lamp)
          if (!figures.length || !result.length) return false

          const isDark = chartTheme.value === 'dark'
          const leftPad = 12
          const topPad = 26
          const bottomPad = 8
          const labelWidth = 76
          const chartLeft = bounding.left || 0
          const chartTop = bounding.top || 0
          const chartWidth = bounding.width || 0
          const chartHeight = bounding.height || 0
          const bodyTop = chartTop + topPad
          const bodyHeight = Math.max(24, chartHeight - topPad - bottomPad)
          const rowCount = Math.max(1, Number(lampBeltMeta.laneCount || 0))
          const rowHeight = bodyHeight / rowCount
          const baseBarWidth = Number(barSpace?.bar ?? barSpace?.gapBar ?? 8)
          const lampWidth = Math.max(3, Math.min(5, (Number.isFinite(baseBarWidth) ? baseBarWidth : 8) * 0.42))
          const lampHeight = Math.max(8, Math.min(12, rowHeight * 0.44))
          const from = Math.max(0, Math.floor(visibleRange?.from ?? visibleRange?.realFrom ?? 0) - 1)
          const to = Math.min(result.length - 1, Math.ceil(visibleRange?.to ?? visibleRange?.realTo ?? result.length - 1) + 1)

          ctx.save()

          const panelBg = isDark ? 'rgba(255,255,255,0.018)' : 'rgba(17,24,39,0.022)'
          const rowBg = isDark ? 'rgba(255,255,255,0.026)' : 'rgba(17,24,39,0.03)'
          const rowLine = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(17,24,39,0.06)'
          const labelBg = isDark ? 'rgba(8,12,18,0.72)' : 'rgba(255,255,255,0.84)'
          const labelBorder = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.10)'
          const textColor = isDark ? 'rgba(220,226,235,0.82)' : 'rgba(45,55,72,0.84)'
          const mutedText = isDark ? 'rgba(215,222,232,0.86)' : 'rgba(45,55,72,0.88)'

          drawRoundedRect(ctx, chartLeft + 6, chartTop + 7, Math.max(0, chartWidth - 12), Math.max(0, chartHeight - 14), 8)
          ctx.fillStyle = panelBg
          ctx.fill()

          ctx.font = '600 12px Inter, Arial, sans-serif'
          ctx.fillStyle = textColor
          ctx.fillText(displayName || indicator.shortName || 'Lamp Belt', chartLeft + leftPad, chartTop + 17)

          ctx.font = '700 10px Inter, Arial, sans-serif'
          const getLaneY = (lane) => {
            const numericLane = Number(lane)
            if (!Number.isFinite(numericLane)) return null
            const clampedLane = Math.max(1, Math.min(rowCount, numericLane))
            return bodyTop + (rowCount - clampedLane + 0.5) * rowHeight
          }

          for (let lane = 1; lane <= rowCount; lane++) {
            const yCenter = getLaneY(lane)
            if (!Number.isFinite(yCenter)) continue
            const rowY = yCenter - rowHeight * 0.38
            if (lane % 2 === 0) {
              drawRoundedRect(ctx, chartLeft + 8, rowY, Math.max(0, chartWidth - 16), rowHeight * 0.76, 5)
              ctx.fillStyle = rowBg
              ctx.fill()
            }
            ctx.beginPath()
            ctx.moveTo(chartLeft + labelWidth + 8, yCenter)
            ctx.lineTo(chartLeft + chartWidth - 10, yCenter)
            ctx.strokeStyle = rowLine
            ctx.lineWidth = 1
            ctx.stroke()

            const label = lampBeltMeta.labelByLane?.get(lane) || `L${lane}`
            const normalizedLabel = String(label)
              .replace(/[_-]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toUpperCase()
              .slice(0, 8)
            drawRoundedRect(ctx, chartLeft + 8, yCenter - 9, labelWidth - 16, 18, 5)
            ctx.fillStyle = labelBg
            ctx.fill()
            ctx.strokeStyle = labelBorder
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.fillStyle = mutedText
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(normalizedLabel, chartLeft + labelWidth / 2, yCenter)
          }

          const minLampX = chartLeft + labelWidth + 12
          const maxLampX = chartLeft + chartWidth - 10
          for (let i = from; i <= to; i++) {
            const x = xAxis.convertToPixel(i)
            if (!Number.isFinite(x) || x < minLampX || x > maxLampX) continue
            const item = result[i] || {}
            for (const figure of figures) {
              const lane = Number(item[figure.key])
              if (!Number.isFinite(lane) || lane < 1 || lane > rowCount) continue
              const yCenter = getLaneY(lane)
              if (!Number.isFinite(yCenter)) continue
              const color = resolveLampColor(item[`${figure.key}__color`] || figure.lamp?.color)
              const x0 = x - lampWidth / 2
              const y0 = yCenter - lampHeight / 2
              drawRoundedRect(ctx, x0, y0, lampWidth, lampHeight, lampWidth / 2)
              ctx.fillStyle = color
              ctx.fill()
            }
          }

          ctx.font = '700 10px Inter, Arial, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          for (let lane = 1; lane <= rowCount; lane++) {
            const yCenter = getLaneY(lane)
            if (!Number.isFinite(yCenter)) continue
            const label = lampBeltMeta.labelByLane?.get(lane) || `L${lane}`
            const normalizedLabel = String(label)
              .replace(/[_-]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toUpperCase()
              .slice(0, 8)
            drawRoundedRect(ctx, chartLeft + 8, yCenter - 9, labelWidth - 16, 18, 5)
            ctx.fillStyle = labelBg
            ctx.fill()
            ctx.strokeStyle = labelBorder
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.fillStyle = mutedText
            ctx.fillText(normalizedLabel, chartLeft + labelWidth / 2, yCenter)
          }

          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'

          ctx.restore()
          return true
        } catch (error) {
          try {
            ctx.restore()
          } catch (_) {}
          return false
        }
      }
    }

    const createLampBeltDrawV2 = (displayName) => {
      return ({ ctx, indicator, bounding }) => {
        const lampBelt = indicator?.extendData?.lampBelt
        if (!lampBelt?.enabled) return false

        try {
          const isDark = chartTheme.value === 'dark'
          const chartLeft = Number(bounding?.left || 0)
          const chartTop = Number(bounding?.top || 0)
          const chartWidth = Number(bounding?.width || 0)
          const chartHeight = Number(bounding?.height || 0)
          const rowCount = Math.max(1, Number(lampBelt.laneCount || 0))
          if (!chartWidth || !chartHeight || !rowCount) return false

          const leftPad = 12
          const topPad = 26
          const bottomPad = 8
          const labelWidth = 82
          const bodyTop = chartTop + topPad
          const bodyHeight = Math.max(24, chartHeight - topPad - bottomPad)
          const rowHeight = bodyHeight / rowCount
          const lanes = Array.isArray(lampBelt.lanes) ? lampBelt.lanes : []
          const labelByLane = new Map(lanes.map(item => [Number(item.lane), item.label]))

          const panelBg = isDark ? 'rgba(255,255,255,0.018)' : 'rgba(17,24,39,0.022)'
          const rowBg = isDark ? 'rgba(255,255,255,0.026)' : 'rgba(17,24,39,0.03)'
          const rowLine = isDark ? 'rgba(255,255,255,0.045)' : 'rgba(17,24,39,0.06)'
          const labelBg = isDark ? 'rgba(8,12,18,0.84)' : 'rgba(255,255,255,0.9)'
          const labelBorder = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.12)'
          const titleColor = isDark ? 'rgba(220,226,235,0.78)' : 'rgba(45,55,72,0.78)'
          const labelColor = isDark ? 'rgba(226,232,240,0.9)' : 'rgba(31,41,55,0.9)'

          const getLaneY = (lane) => {
            const numericLane = Number(lane)
            if (!Number.isFinite(numericLane)) return null
            const clampedLane = Math.max(1, Math.min(rowCount, numericLane))
            return bodyTop + (rowCount - clampedLane + 0.5) * rowHeight
          }

          ctx.save()
          drawRoundedRect(ctx, chartLeft + 6, chartTop + 7, Math.max(0, chartWidth - 12), Math.max(0, chartHeight - 14), 8)
          ctx.fillStyle = panelBg
          ctx.fill()

          ctx.font = '600 12px Inter, Arial, sans-serif'
          ctx.fillStyle = titleColor
          ctx.textAlign = 'left'
          ctx.textBaseline = 'alphabetic'
          ctx.fillText(displayName || indicator.shortName || 'Lamp Belt', chartLeft + leftPad, chartTop + 17)

          ctx.font = '700 10px Inter, Arial, sans-serif'
          for (let lane = 1; lane <= rowCount; lane++) {
            const yCenter = getLaneY(lane)
            if (!Number.isFinite(yCenter)) continue
            const rowY = yCenter - rowHeight * 0.38
            if (lane % 2 === 0) {
              drawRoundedRect(ctx, chartLeft + 8, rowY, Math.max(0, chartWidth - 16), rowHeight * 0.76, 5)
              ctx.fillStyle = rowBg
              ctx.fill()
            }

            ctx.beginPath()
            ctx.moveTo(chartLeft + labelWidth + 8, yCenter)
            ctx.lineTo(chartLeft + chartWidth - 10, yCenter)
            ctx.strokeStyle = rowLine
            ctx.lineWidth = 1
            ctx.stroke()

            const normalizedLabel = String(labelByLane.get(lane) || `L${lane}`)
              .replace(/[_-]+/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toUpperCase()
              .slice(0, 8)
            drawRoundedRect(ctx, chartLeft + 8, yCenter - 9, labelWidth - 16, 18, 5)
            ctx.fillStyle = labelBg
            ctx.fill()
            ctx.strokeStyle = labelBorder
            ctx.lineWidth = 1
            ctx.stroke()
            ctx.fillStyle = labelColor
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(normalizedLabel, chartLeft + labelWidth / 2, yCenter)
          }

          ctx.restore()
        } catch (error) {
          try {
            ctx.restore()
          } catch (_) {}
        }

        return false
      }
    }

    const createLampBeltExtendData = (lampBeltMeta, figures) => {
      if (!lampBeltMeta?.enabled) return null
      const lanes = []
      if (lampBeltMeta.labelByLane && typeof lampBeltMeta.labelByLane.forEach === 'function') {
        lampBeltMeta.labelByLane.forEach((label, lane) => {
          lanes.push({ lane, label })
        })
      }
      return {
        enabled: true,
        laneCount: lampBeltMeta.laneCount,
        lanes,
        figures: (figures || [])
          .filter(figure => figure?.lamp)
          .map(figure => ({
            key: figure.key,
            lane: figure.lamp.lane,
            label: figure.lamp.label,
            color: figure.lamp.color,
            size: figure.lamp.size
          }))
      }
    }

    const normalizeLampLaneLabel = (label, lane) => {
      return String(label || `L${lane}`)
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase()
        .slice(0, 8)
    }

    const appendLampLaneLabelFigures = (figures, plotDataMap, lampBeltMeta, dataLength) => {
      if (!lampBeltMeta?.enabled || !lampBeltMeta.labelByLane) return
      const total = Math.max(0, Number(dataLength || 0))
      if (!total) return

      lampBeltMeta.labelByLane.forEach((label, lane) => {
        const numericLane = Number(lane)
        if (!Number.isFinite(numericLane)) return
        const labelText = normalizeLampLaneLabel(label, numericLane)
        const bgKey = `__lamp_lane_${numericLane}_bg`
        const textKey = `__lamp_lane_${numericLane}_label`

        plotDataMap[bgKey] = Array(total).fill(numericLane)
        plotDataMap[textKey] = Array(total).fill(numericLane)

        figures.push({
          key: bgKey,
          title: '',
          type: 'rect',
          attrs: ({ coordinate, bounding }) => {
            const y = coordinate?.current?.[bgKey]
            const left = Number(bounding?.left || 0)
            if (!Number.isFinite(y)) return { x: -9999, y: -9999, width: 0, height: 0 }
            return {
              x: left + 8,
              y: y - 9,
              width: 58,
              height: 18
            }
          },
          styles: () => {
            const isDark = chartTheme.value === 'dark'
            return {
              style: 'stroke_fill',
              color: isDark ? 'rgba(8,12,18,0.86)' : 'rgba(255,255,255,0.92)',
              borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.12)',
              borderSize: 1
            }
          }
        })

        figures.push({
          key: textKey,
          title: '',
          type: 'text',
          attrs: ({ coordinate, bounding }) => {
            const y = coordinate?.current?.[textKey]
            const left = Number(bounding?.left || 0)
            if (!Number.isFinite(y)) return { x: -9999, y: -9999, text: '' }
            return {
              x: left + 14,
              y,
              text: labelText,
              align: 'left',
              baseline: 'middle'
            }
          },
          styles: () => ({
            color: chartTheme.value === 'dark' ? 'rgba(226,232,240,0.94)' : 'rgba(31,41,55,0.92)',
            size: 10,
            weight: '700'
          })
        })
      })
    }

    const createLampBeltTooltip = (displayName) => () => ({
      name: displayName || 'Lamp Belt',
      calcParamsText: '',
      icons: [],
      values: []
    })


return { buildAlignedPlotRows, getCustomPaneOptions, build(dataLength, plots, name) {
      const buildCustomPlotBundle = (plots, fallbackNameForIndex) => {
        const figures = []
        const plotDataMap = {}
        const lampBeltMeta = createLampBeltMeta(plots)
        const renderPlots = plots
          .map((plot, plotIdx) => ({ plot, plotIdx }))
          .filter(({ plotIdx }) => !lampBeltMeta.hiddenIndexes.has(plotIdx))

        for (const { plot, plotIdx } of renderPlots) {
          const forceLamp = lampBeltMeta.laneByIndex.has(plotIdx)
          const lampLane = lampBeltMeta.laneByIndex.get(plotIdx)
          const fallbackName = typeof fallbackNameForIndex === 'function'
            ? fallbackNameForIndex(plotIdx)
            : `PLOT_${plotIdx}`
          const { figureKey, figure, colorKey, sizeKey } = buildCustomPlotFigure(plot, plotIdx, fallbackName, {
            forceLamp,
            lampLane
          })

          figures.push(figure)
          plotDataMap[figureKey] = normalizePlotDataSeries(plot.data, {
            forceLamp,
            lampLane
          })
          plotDataMap[colorKey] = extractPlotColorSeries(plot.data)
          plotDataMap[sizeKey] = extractPlotSizeSeries(plot.data)
        }

        appendLampLaneLabelFigures(figures, plotDataMap, lampBeltMeta, dataLength)
        return {
          figures,
          plotDataMap,
          lampBeltMeta,
          lampBeltExtendData: createLampBeltExtendData(lampBeltMeta, figures)
        }
      }
      const customPlotExtraConfig = (bundle, displayName) => bundle.lampBeltMeta.enabled
        ? {
            minValue: 1,
            maxValue: bundle.lampBeltMeta.laneCount,
            extendData: { lampBelt: bundle.lampBeltExtendData },
            draw: createLampBeltDrawV2(displayName),
            createTooltipDataSource: createLampBeltTooltip(displayName)
          }
        : {}

 const bundle = buildCustomPlotBundle(plots);return {...bundle,extra:customPlotExtraConfig(bundle,name)}
}}
}
