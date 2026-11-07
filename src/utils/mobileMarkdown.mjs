import { parseResearchChartBlock } from './researchCharts.mjs'

export function escapeMarkdownHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function renderInlineMarkdown(value) {
  return escapeMarkdownHtml(value)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>')
}

export function splitMarkdownTableRow(value) {
  let source = String(value || '').trim()
  if (source.startsWith('|')) source = source.slice(1)
  if (source.endsWith('|') && !source.endsWith('\\|')) source = source.slice(0, -1)
  const cells = []
  let current = ''
  let escaped = false
  let inCode = false
  for (const char of source) {
    if (escaped) {
      current += char
      escaped = false
      continue
    }
    if (char === '\\') {
      escaped = true
      continue
    }
    if (char === '`') {
      inCode = !inCode
      current += char
      continue
    }
    if (char === '|' && !inCode) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += char
  }
  if (escaped) current += '\\'
  cells.push(current.trim())
  return cells
}

const tableAlignment = value => {
  const cell = String(value || '').replace(/\s/g, '')
  if (!/^:?-{3,}:?$/.test(cell)) return ''
  if (cell.startsWith(':') && cell.endsWith(':')) return 'center'
  if (cell.endsWith(':')) return 'right'
  return 'left'
}

export function isMarkdownTableSeparator(value) {
  const cells = splitMarkdownTableRow(value)
  return cells.length > 1 && cells.every(cell => Boolean(tableAlignment(cell)))
}

export function renderMarkdownTable(rows) {
  if (!Array.isArray(rows) || rows.length < 2) return ''
  const header = splitMarkdownTableRow(rows[0])
  const alignments = splitMarkdownTableRow(rows[1]).map(tableAlignment)
  if (header.length < 2 || alignments.length !== header.length || alignments.some(value => !value)) return ''
  const body = rows.slice(2).map(splitMarkdownTableRow)
  const cell = (tag, value, alignment) => `<${tag} class="md-align-${alignment}">${renderInlineMarkdown(value)}</${tag}>`
  return [
    '<div class="md-table-wrap"><table class="md-table">',
    `<thead><tr>${header.map((value, index) => cell('th', value, alignments[index])).join('')}</tr></thead>`,
    '<tbody>',
    body.map(row => {
      const normalized = Array.from({ length: header.length }, (_, index) => row[index] || '')
      return `<tr>${normalized.map((value, index) => cell('td', value, alignments[index])).join('')}</tr>`
    }).join(''),
    '</tbody></table></div>'
  ].join('')
}

export function renderMarkdownText(value) {
  const lines = String(value || '').replace(/\r\n/g, '\n').split('\n')
  const html = []
  let listType = ''
  let quoteLines = []
  let paragraph = []
  const flushParagraph = () => {
    if (!paragraph.length) return
    html.push(`<p>${paragraph.map(renderInlineMarkdown).join('<br>')}</p>`)
    paragraph = []
  }
  const flushList = () => {
    if (!listType) return
    html.push(`</${listType}>`)
    listType = ''
  }
  const flushQuote = () => {
    if (!quoteLines.length) return
    html.push(`<blockquote>${quoteLines.map(renderInlineMarkdown).join('<br>')}</blockquote>`)
    quoteLines = []
  }
  const flushBlocks = () => {
    flushParagraph()
    flushList()
    flushQuote()
  }

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index]
    const line = raw.trimEnd()
    const trimmed = line.trim()
    if (!trimmed) {
      flushBlocks()
      continue
    }

    if (trimmed.includes('|') && isMarkdownTableSeparator(lines[index + 1] || '')) {
      flushBlocks()
      const rows = [line, lines[index + 1]]
      index += 2
      while (index < lines.length && lines[index].trim().includes('|')) {
        rows.push(lines[index])
        index += 1
      }
      index -= 1
      html.push(renderMarkdownTable(rows))
      continue
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushBlocks()
      html.push('<hr>')
      continue
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      flushBlocks()
      const level = Math.min(heading[1].length + 2, 5)
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    const quote = trimmed.match(/^>\s?(.*)$/)
    if (quote) {
      flushParagraph()
      flushList()
      quoteLines.push(quote[1])
      continue
    }

    const ordered = trimmed.match(/^\d+[.)、）]\s+(.+)$/)
    const unordered = trimmed.match(/^[-*+]\s+(.+)$/)
    if (ordered || unordered) {
      flushParagraph()
      flushQuote()
      const nextType = ordered ? 'ol' : 'ul'
      if (listType !== nextType) {
        flushList()
        listType = nextType
        html.push(`<${listType}>`)
      }
      html.push(`<li>${renderInlineMarkdown((ordered || unordered)[1])}</li>`)
      continue
    }

    flushList()
    flushQuote()
    paragraph.push(line)
  }

  flushBlocks()
  return html.join('')
}

export function renderMobileMarkdown(content, labels = {}) {
  const source = String(content || '').replace(/\r\n/g, '\n')
  const blocks = []
  const fence = /```([\w+-]*)\s*\n([\s\S]*?)```/g
  let lastIndex = 0
  let match
  while ((match = fence.exec(source))) {
    if (match.index > lastIndex) {
      const html = renderMarkdownText(source.slice(lastIndex, match.index))
      if (html) blocks.push({ type: 'html', html })
    }
    const lang = String(match[1] || '').toLowerCase()
    const code = match[2].replace(/\n$/, '')
    const spec = parseResearchChartBlock(lang, code, labels)
    blocks.push(spec ? { type: 'chart', spec } : { type: 'code', lang, code })
    lastIndex = fence.lastIndex
  }
  if (lastIndex < source.length) {
    const html = renderMarkdownText(source.slice(lastIndex))
    if (html) blocks.push({ type: 'html', html })
  }
  return blocks
}
