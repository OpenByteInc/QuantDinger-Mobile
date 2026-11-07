const SUPPORTED_TYPES = new Set(['line', 'bar', 'area', 'pie', 'scatter', 'graph'])
const MAX_SERIES = 8
const MAX_POINTS = 160

const asText = value => String(value == null ? '' : value).trim()
const finiteNumber = value => {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
const quotedText = value => asText(value).replace(/^['"]|['"]$/g, '')

const cleanValues = values => (Array.isArray(values) ? values : [])
  .slice(0, MAX_POINTS)
  .map(value => {
    if (!Array.isArray(value)) return finiteNumber(value)
    const pair = value.slice(0, 2).map(finiteNumber)
    return pair.every(item => item !== null) ? pair : null
  })
  .filter(value => value !== null)

export function normalizeResearchChartSpec(input, labels = {}) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const type = SUPPORTED_TYPES.has(asText(raw.type).toLowerCase()) ? asText(raw.type).toLowerCase() : ''
  if (!type) return null

  const fallbackSeries = asText(labels.series)
  const rawCategories = raw.categories || raw.labels || raw.xAxis || raw.x || []
  const categories = (Array.isArray(rawCategories) ? rawCategories : [])
    .slice(0, MAX_POINTS)
    .map(asText)

  if (type === 'graph') {
    const nodes = (Array.isArray(raw.nodes) ? raw.nodes : []).slice(0, 60).map(item => ({
      id: asText(item?.id),
      name: asText(item?.name || item?.label || item?.id)
    })).filter(item => item.id && item.name)
    const nodeIds = new Set(nodes.map(item => item.id))
    const links = (Array.isArray(raw.links) ? raw.links : []).slice(0, 100).map(item => ({
      source: asText(item?.source),
      target: asText(item?.target),
      label: asText(item?.label || item?.name)
    })).filter(item => nodeIds.has(item.source) && nodeIds.has(item.target))
    return nodes.length && links.length
      ? { type, title: asText(raw.title), subtitle: asText(raw.subtitle), nodes, links }
      : null
  }

  if (type === 'pie') {
    const source = Array.isArray(raw.data)
      ? raw.data
      : (Array.isArray(raw.series) && raw.series[0] ? raw.series[0].data : [])
    const data = (Array.isArray(source) ? source : []).slice(0, MAX_POINTS).map((item, index) => {
      if (item && typeof item === 'object' && !Array.isArray(item)) {
        const value = finiteNumber(item.value)
        return value === null ? null : { name: asText(item.name) || categories[index] || String(index + 1), value }
      }
      const value = finiteNumber(item)
      return value === null ? null : { name: categories[index] || String(index + 1), value }
    }).filter(Boolean)
    return data.length
      ? {
          type,
          title: asText(raw.title),
          subtitle: asText(raw.subtitle),
          unit: asText(raw.unit),
          series: [{ name: asText(raw.name) || fallbackSeries, data }]
        }
      : null
  }

  const rawSeries = Array.isArray(raw.series)
    ? raw.series
    : (Array.isArray(raw.data) ? [{ name: raw.name, data: raw.data }] : [])
  const series = rawSeries.slice(0, MAX_SERIES).map((item, index) => {
    const entry = item && typeof item === 'object' && !Array.isArray(item) ? item : { data: item }
    const data = cleanValues(entry.data)
    if (!data.length) return null
    const requestedType = asText(entry.type).toLowerCase()
    return {
      name: asText(entry.name) || `${fallbackSeries} ${index + 1}`.trim(),
      data,
      type: SUPPORTED_TYPES.has(requestedType) ? requestedType : type
    }
  }).filter(Boolean)
  if (!series.length) return null

  const longest = Math.max(...series.map(item => item.data.length))
  return {
    type,
    title: asText(raw.title),
    subtitle: asText(raw.subtitle),
    unit: asText(raw.unit),
    categories: categories.length
      ? categories.slice(0, longest)
      : Array.from({ length: longest }, (_, index) => String(index + 1)),
    series
  }
}

export function parseMermaidResearchChart(source, labels = {}) {
  const lines = String(source || '').replace(/\r\n/g, '\n').split('\n').map(line => line.trim()).filter(Boolean)
  if (!lines.length) return null

  if (/^pie\b/i.test(lines[0])) {
    let title = ''
    const data = []
    lines.slice(1).forEach(line => {
      const titleMatch = line.match(/^title\s+(.+)$/i)
      if (titleMatch) {
        title = quotedText(titleMatch[1])
        return
      }
      const valueMatch = line.match(/^(?:"([^"]+)"|'([^']+)'|([^:]+))\s*:\s*(-?\d+(?:\.\d+)?)$/)
      if (valueMatch) data.push({ name: asText(valueMatch[1] || valueMatch[2] || valueMatch[3]), value: Number(valueMatch[4]) })
    })
    return normalizeResearchChartSpec({ type: 'pie', title, data }, labels)
  }

  if (/^xychart(?:-beta)?\b/i.test(lines[0])) {
    let title = ''
    let unit = ''
    let categories = []
    const series = []
    const counts = { line: 0, bar: 0 }
    lines.slice(1).forEach(line => {
      const titleMatch = line.match(/^title\s+(.+)$/i)
      if (titleMatch) {
        title = quotedText(titleMatch[1])
        return
      }
      const xMatch = line.match(/^x-axis(?:\s+"[^"]*")?\s*\[([^\]]+)\]/i)
      if (xMatch) {
        categories = xMatch[1].split(',').map(quotedText)
        return
      }
      const yMatch = line.match(/^y-axis\s+(?:"([^"]*)"\s+)?/i)
      if (yMatch) {
        unit = asText(yMatch[1])
        return
      }
      const seriesMatch = line.match(/^(line|bar)\s*\[([^\]]+)\]/i)
      if (!seriesMatch) return
      const seriesType = seriesMatch[1].toLowerCase()
      counts[seriesType] += 1
      const prefix = asText(labels[seriesType]) || asText(labels.series)
      series.push({
        name: `${prefix} ${counts[seriesType]}`.trim(),
        type: seriesType,
        data: seriesMatch[2].split(',').map(value => value.trim())
      })
    })
    return normalizeResearchChartSpec({ type: series[0]?.type || 'line', title, unit, categories, series }, labels)
  }

  if (/^(?:flowchart|graph)\b/i.test(lines[0])) {
    const nodeMap = new Map()
    const links = []
    const readNode = raw => {
      const match = asText(raw).match(/^([\w.-]+)(?:\[([^\]]+)\]|\(([^)]+)\)|\{([^}]+)\})?$/)
      if (!match) return null
      const explicitName = asText(match[2] || match[3] || match[4])
      const existing = nodeMap.get(match[1])
      const node = { id: match[1], name: explicitName || existing?.name || match[1] }
      if (!existing || explicitName) nodeMap.set(node.id, node)
      return node
    }
    lines.slice(1).forEach(line => {
      const edge = line.match(/^(.+?)\s*--+>\s*(?:\|([^|]+)\|\s*)?(.+)$/)
      if (!edge) return
      const sourceNode = readNode(edge[1])
      const targetNode = readNode(edge[3])
      if (sourceNode && targetNode) links.push({ source: sourceNode.id, target: targetNode.id, label: asText(edge[2]) })
    })
    return normalizeResearchChartSpec({ type: 'graph', nodes: Array.from(nodeMap.values()), links }, labels)
  }

  return null
}

export function parseResearchChartBlock(language, source, labels = {}) {
  const kind = asText(language).toLowerCase()
  if (kind === 'mermaid') return parseMermaidResearchChart(source, labels)
  if (!['chart', 'echarts', 'qd-chart'].includes(kind)) return null
  try {
    return normalizeResearchChartSpec(JSON.parse(String(source || '')), labels)
  } catch {
    return null
  }
}

export function buildResearchChartOption(spec, palette = {}) {
  const textColor = palette.text || '#182018'
  const mutedColor = palette.muted || '#70766c'
  const borderColor = palette.border || 'rgba(24, 32, 24, 0.14)'
  const tooltipBackground = palette.tooltip || '#fffdf7'
  const accent = palette.accent || '#0f6f4f'
  const colors = palette.colors || [accent, '#b7791f', '#33658a', '#9c5b45', '#6b7f52', '#8a6d9f']
  const common = {
    animationDuration: 320,
    color: colors,
    textStyle: { color: textColor, fontFamily: 'inherit' },
    title: spec.title ? {
      text: spec.title,
      subtext: spec.subtitle || '',
      left: 8,
      top: 4,
      textStyle: { color: textColor, fontSize: 13, fontWeight: 700 },
      subtextStyle: { color: mutedColor, fontSize: 10 }
    } : undefined,
    tooltip: {
      trigger: spec.type === 'pie' ? 'item' : 'axis',
      confine: true,
      backgroundColor: tooltipBackground,
      borderColor,
      textStyle: { color: textColor, fontSize: 11 }
    }
  }

  if (spec.type === 'pie') {
    return {
      ...common,
      legend: { type: 'scroll', bottom: 0, textStyle: { color: mutedColor, fontSize: 10 } },
      series: [{
        name: spec.series[0].name,
        type: 'pie',
        radius: ['38%', '64%'],
        center: ['50%', spec.title ? '51%' : '45%'],
        itemStyle: { borderColor: tooltipBackground, borderWidth: 2 },
        label: { color: textColor, fontSize: 10, formatter: '{b}: {d}%' },
        data: spec.series[0].data
      }]
    }
  }

  if (spec.type === 'graph') {
    return {
      ...common,
      tooltip: { ...common.tooltip, trigger: 'item' },
      series: [{
        type: 'graph',
        layout: 'force',
        roam: true,
        symbolSize: 40,
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: 6,
        label: { show: true, color: textColor, width: 80, overflow: 'break', fontSize: 10 },
        edgeLabel: { show: true, color: mutedColor, fontSize: 9, formatter: params => params.data?.label || '' },
        lineStyle: { color: borderColor, width: 1.5, curveness: 0.08 },
        force: { repulsion: 190, edgeLength: 80, gravity: 0.08 },
        data: spec.nodes.map((item, index) => ({ ...item, itemStyle: { color: colors[index % colors.length] } })),
        links: spec.links
      }]
    }
  }

  const isScatter = spec.type === 'scatter'
  const pointCount = Math.max(...spec.series.map(item => item.data.length))
  return {
    ...common,
    legend: spec.series.length > 1 ? { type: 'scroll', top: spec.title ? 42 : 2, right: 4, textStyle: { color: mutedColor, fontSize: 9 } } : undefined,
    grid: { left: 8, right: 12, top: spec.title ? 66 : 26, bottom: pointCount > 16 ? 45 : 22, containLabel: true },
    xAxis: isScatter
      ? { type: 'value', axisLabel: { color: mutedColor, fontSize: 9 }, splitLine: { lineStyle: { color: borderColor } } }
      : { type: 'category', data: spec.categories, boundaryGap: spec.type === 'bar', axisLabel: { color: mutedColor, fontSize: 9, hideOverlap: true }, axisLine: { lineStyle: { color: borderColor } } },
    yAxis: { type: 'value', name: spec.unit || '', nameTextStyle: { color: mutedColor, fontSize: 9 }, axisLabel: { color: mutedColor, fontSize: 9 }, splitLine: { lineStyle: { color: borderColor } } },
    dataZoom: !isScatter && pointCount > 16 ? [{ type: 'inside' }, { type: 'slider', height: 12, bottom: 3, borderColor, textStyle: { color: mutedColor, fontSize: 8 } }] : undefined,
    series: spec.series.map(item => {
      const type = item.type === 'area' ? 'line' : (item.type || spec.type)
      return {
        name: item.name,
        type,
        data: item.data,
        smooth: type === 'line',
        symbolSize: isScatter ? 7 : 4,
        showSymbol: pointCount <= 32,
        areaStyle: item.type === 'area' || spec.type === 'area' ? { opacity: 0.14 } : undefined,
        emphasis: { focus: 'series' }
      }
    })
  }
}
