# Mobile Density Design QA

## Comparison target

- Source visual truth:
  - `/var/folders/bb/zttk5zmj1bqgl_7fy42dnjfm0000gn/T/codex-clipboard-1b800bf2-9f62-43a9-88ad-2d36b6d28928.png`
  - `/var/folders/bb/zttk5zmj1bqgl_7fy42dnjfm0000gn/T/codex-clipboard-92691e80-6add-4900-b290-6edeaec02c51.png`
- Rendered implementation:
  - `design-qa-assets/ai-compact.png`
  - `design-qa-assets/chart-compact.png`
- Additional route evidence:
  - `design-qa-assets/market-compact.png`
  - `design-qa-assets/strategy-compact.png`
  - `design-qa-assets/profile-compact.png`
- CSS viewport: 390 × 844, device scale factor 1.
- Source pixels: 774 × 1178 and 760 × 1178. These are higher-density/cropped mobile captures; comparison was normalized to the app-owned content width and focused on horizontal gutters rather than browser/device chrome or vertical crop.
- State: authenticated dark-theme mobile web app. The AI comparison uses the same saved BTC/USDT analysis conversation; the chart comparison uses Trend Reversal Toolkit on BTC/USDT 1H.

## Full-view comparison evidence

- AI: the reference loses substantial width to page padding, message-list padding, and two avatar columns. The implementation removes both avatar columns and expands the assistant response to the full content width while preserving right alignment for user messages.
- Chart: the reference uses visibly wide outer card gutters. The implementation reduces the shared page gutter to 10px and reduces the chart card's inner horizontal padding without clipping controls, labels, candles, signals, or the bottom navigation.
- Market, strategy, profile, credits, notification, credential, security and analysis surfaces now consume the same 10px outer-gutter token where they previously used 14–18px page margins.

## Focused region comparison evidence

- AI message column: avatar elements are absent from the rendered accessibility tree and visible screenshot. Assistant bubbles occupy 100% of the content column; user bubbles may occupy up to 94% and remain right-aligned.
- Chart card edges: outer margins are 10px and chart content padding is 10px. The selector chevrons, timeframe controls, price header and plot remain inside the card without overflow.

## Required fidelity surfaces

- Fonts and typography: existing font family, sizes, weights, line heights and financial number treatment are preserved. Wider content reduces unnecessary wrapping.
- Spacing and layout rhythm: the shared outer gutter is now 10px; large nested AI/avatar gutters are removed. Card rhythm and bottom-navigation clearance remain intact.
- Colors and visual tokens: no palette or semantic-state color changes.
- Image quality and asset fidelity: no raster assets were added, removed or degraded. The requested avatar removal applies only to AI chat message affordances, not the user's profile identity screen.
- Copy and content: unchanged.

## Comparison history

1. Initial P1: AI content width was materially reduced by user/AI avatar placeholders and nested side padding. Fix: removed avatar markup and styles; widened assistant and user message containers.
2. Initial P2: chart and other primary screens used inconsistent 14–18px outer gutters. Fix: introduced `--page-gutter: 10px` and applied it to primary page shells and outer cards.
3. Post-fix evidence: `ai-compact.png`, `chart-compact.png`, `market-compact.png`, `strategy-compact.png`, and `profile-compact.png` show no remaining P0/P1/P2 spacing or clipping issue.

## Verification

- Primary interactions tested: AI history drawer, loading a prior conversation, and navigation across AI, chart, market, strategy and profile routes.
- Browser console: no application errors; only Vite connection debug messages.
- Unit checks: 15/15 passed.
- Production build: passed.
- No backtest, purchase, order, or live-trading mutation was executed.

## Findings

No actionable P0/P1/P2 findings remain for the requested density change.

## Follow-up polish

- P3: verify the 10px gutter on a physical iPhone with a non-zero safe-area inset and on a 320px-wide Android device.

final result: passed
