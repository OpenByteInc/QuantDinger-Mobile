
const TIMEFRAME_MINUTES = {
  '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440
}

const FREQUENCY_MINUTES = {
  hourly: 60, '4h': 240, daily: 1440, weekly: 10080, biweekly: 20160, monthly: 43200
}

export const BOT_SCRIPT_TEMPLATES = {

  grid: () => `# ---- Grid Trading Bot (resting engine placeholder) ----

def on_init(ctx):
    ctx.log("grid bot: live execution uses resting limit-order engine")

def on_bar(ctx, bar):
    pass
`,

  martingale: (params) => `# ---- Martingale Bot ----
import time as _time

INIT_AMT    = ${params.initialAmount}
MULTIPLIER  = ${params.multiplier}
MAX_LAYERS  = ${params.maxLayers}
DROP_PCT    = ${params.priceDropPct} / 100.0
TP_PCT      = ${params.takeProfitPct} / 100.0
SL_PCT      = ${(params.stopLossPct || 0)} / 100.0
DIRECTION   = "${params.direction || 'long'}"
ORDER_WAIT  = 120
BUDGET      = ${params._initialCapital || 0}

# Trailing take-profit (optional). When USE_TRAILING_TP is True the TP_PCT
# above is re-interpreted as the *activation* threshold: profit must first
# break above TP_PCT before peak tracking starts, after which the cycle
# exits as soon as price retraces TP_CB_PCT from the recorded peak.
USE_TRAILING_TP = ${params.trailingTpEnabled ? 'True' : 'False'}
TP_CB_PCT       = ${(params.trailingTpCallbackPct != null ? params.trailingTpCallbackPct : 0)} / 100.0

def on_init(ctx):
    ctx.param("layer", 0)
    ctx.param("last_entry_price", 0.0)
    ctx.param("total_cost", 0.0)
    ctx.param("total_qty", 0.0)
    ctx.param("last_order_ts", 0)
    # Trailing TP state: peak_price tracks best price since cycle start
    # (highest for long, lowest for short); trailing_active flips True once
    # profit breaks above TP_PCT (activation threshold).
    ctx.param("peak_price", 0.0)
    ctx.param("trailing_active", False)

def _reset_state(ctx):
    ctx._params["layer"] = 0
    ctx._params["total_cost"] = 0.0
    ctx._params["total_qty"] = 0.0
    ctx._params["last_entry_price"] = 0.0
    ctx._params["last_order_ts"] = 0
    ctx._params["peak_price"] = 0.0
    ctx._params["trailing_active"] = False

def _budget_ok(cost, amt):
    if BUDGET <= 0:
        return True
    return (cost + amt) <= BUDGET

def on_bar(ctx, bar):
    price = bar.close
    layer      = ctx.param("layer", 0)
    last_entry = ctx.param("last_entry_price", 0.0)
    cost       = ctx.param("total_cost", 0.0)
    qty        = ctx.param("total_qty", 0.0)
    last_ts    = ctx.param("last_order_ts", 0)
    has_pos    = ctx.position and float(ctx.position.get("size", 0)) > 0
    now        = int(_time.time())

    if not has_pos and layer == 0:
        if ctx.param("waterfall_pause", False):
            return
        if not _budget_ok(0, INIT_AMT):
            ctx.log("Budget exhausted (%.2f quote), skip opening" % BUDGET)
            return
        if DIRECTION == "long":
            ctx.buy(price=price, amount=INIT_AMT)
            ctx.log("Layer 1: BUY %.2f quote @ %.4f" % (INIT_AMT, price))
        else:
            ctx.sell(price=price, amount=INIT_AMT)
            ctx.log("Layer 1: SELL %.2f quote @ %.4f" % (INIT_AMT, price))
        entry_qty = INIT_AMT / price if price > 0 else 0
        ctx._params["layer"] = 1
        ctx._params["last_entry_price"] = price
        ctx._params["total_cost"] = INIT_AMT
        ctx._params["total_qty"] = entry_qty
        ctx._params["last_order_ts"] = now
        # Seed trailing state with the entry price so the first peak is
        # never below the entry for longs / above the entry for shorts.
        ctx._params["peak_price"] = price
        ctx._params["trailing_active"] = False
        return

    if not has_pos and layer > 0:
        if last_ts > 0 and (now - last_ts) < ORDER_WAIT:
            return
        ctx.log("Position gone after wait, resetting (layer was %d)" % layer)
        _reset_state(ctx)
        return

    avg_price = cost / qty if qty > 0 else last_entry

    # ---- Trailing peak update (always-on bookkeeping; used only when
    # USE_TRAILING_TP is True). We track peak even before activation so
    # the moment trailing activates we already have an accurate baseline.
    peak_price = ctx.param("peak_price", 0.0)
    if peak_price <= 0:
        peak_price = avg_price if avg_price > 0 else price
    if DIRECTION == "long":
        if price > peak_price:
            peak_price = price
    else:
        if price < peak_price:
            peak_price = price
    ctx._params["peak_price"] = peak_price

    if DIRECTION == "long":
        profit_pct = (price - avg_price) / avg_price if avg_price > 0 else 0.0
        sl_hit     = SL_PCT > 0 and avg_price > 0 and price <= avg_price * (1 - SL_PCT)
        add_hit    = layer < MAX_LAYERS and last_entry > 0 and price <= last_entry * (1 - DROP_PCT)
    else:
        profit_pct = (avg_price - price) / avg_price if avg_price > 0 else 0.0
        sl_hit     = SL_PCT > 0 and avg_price > 0 and price >= avg_price * (1 + SL_PCT)
        add_hit    = layer < MAX_LAYERS and last_entry > 0 and price >= last_entry * (1 + DROP_PCT)

    if USE_TRAILING_TP and avg_price > 0:
        trailing_active = ctx.param("trailing_active", False)

        # Activation: once unrealised profit breaks above TP_PCT, start
        # following the peak. Once flipped on we don't flip it back off
        # within the same cycle (resetting is done in _reset_state).
        if not trailing_active and profit_pct >= TP_PCT:
            trailing_active = True
            ctx._params["trailing_active"] = True
            ctx.log("TRAILING TP ARMED @ %.4f, avg=%.4f, profit=%.2f%%, peak=%.4f"
                    % (price, avg_price, profit_pct * 100, peak_price))

        # Trigger: once armed, exit on retracement from the peak.
        if trailing_active and peak_price > 0:
            if DIRECTION == "long":
                drawdown = (peak_price - price) / peak_price
            else:
                drawdown = (price - peak_price) / peak_price
            if drawdown >= TP_CB_PCT:
                pnl = (price - avg_price) * qty if DIRECTION == "long" else (avg_price - price) * qty
                ctx.log("TRAILING TP EXIT @ %.4f (peak=%.4f, drawdown=%.2f%%), avg=%.4f, PnL=%.2f quote"
                        % (price, peak_price, drawdown * 100, avg_price, pnl))
                ctx.close_position()
                _reset_state(ctx)
                return
        tp_hit = False
    else:
        # Classic fixed take-profit: close immediately on hit.
        tp_hit = profit_pct >= TP_PCT and avg_price > 0

    if tp_hit:
        pnl = (price - avg_price) * qty if DIRECTION == "long" else (avg_price - price) * qty
        ctx.log("TAKE PROFIT @ %.4f, avg=%.4f, PnL=%.2f quote" % (price, avg_price, pnl))
        ctx.close_position()
        _reset_state(ctx)
        return

    if sl_hit:
        pnl = (price - avg_price) * qty if DIRECTION == "long" else (avg_price - price) * qty
        ctx.log("STOP LOSS @ %.4f, avg=%.4f, PnL=%.2f quote" % (price, avg_price, pnl))
        ctx.close_position()
        _reset_state(ctx)
        return

    if add_hit and not ctx.param("waterfall_pause", False):
        amt = INIT_AMT * (MULTIPLIER ** layer)
        if not _budget_ok(cost, amt):
            ctx.log("Budget cap reached (cost=%.2f + amt=%.2f > %.2f quote), skip add layer %d" % (cost, amt, BUDGET, layer + 1))
            return
        if DIRECTION == "long":
            ctx.buy(price=price, amount=amt)
            ctx.log("Layer %d: BUY %.2f quote @ %.4f" % (layer + 1, amt, price))
        else:
            ctx.sell(price=price, amount=amt)
            ctx.log("Layer %d: SELL %.2f quote @ %.4f" % (layer + 1, amt, price))
        add_qty = amt / price if price > 0 else 0
        ctx._params["layer"] = layer + 1
        ctx._params["last_entry_price"] = price
        ctx._params["total_cost"] = cost + amt
        ctx._params["total_qty"] = qty + add_qty
        ctx._params["last_order_ts"] = now
        # Adding a layer doesn't reset trailing armed state — that would be
        # exploitable: a small dip that triggers an add could disarm a
        # trailing exit that was about to fire. We deliberately keep
        # trailing_active and peak_price untouched here.
`,

  trend: (params) => `# ---- Trend Following Bot ----
MA_PERIOD    = ${params.maPeriod}
MA_TYPE      = "${params.maType || 'EMA'}"
CONFIRM_BARS = ${params.confirmBars}
POS_PCT      = ${params.positionPct} / 100.0
DIRECTION    = "${params.direction || 'long'}"

# Trailing take-profit (optional). When USE_TRAILING_TP is True, once
# unrealised profit (vs entry price) crosses TP_ACT_PCT, the bot tracks
# the best price reached and exits the moment the price retraces by
# TP_CB_PCT from that peak — independent of the MA crossback signal.
USE_TRAILING_TP = ${params.trailingTpEnabled ? 'True' : 'False'}
TP_ACT_PCT      = ${(params.trailingTpActivationPct != null ? params.trailingTpActivationPct : 0)} / 100.0
TP_CB_PCT       = ${(params.trailingTpCallbackPct != null ? params.trailingTpCallbackPct : 0)} / 100.0

def _sma(closes):
    if len(closes) < MA_PERIOD:
        return None
    return sum(closes[-MA_PERIOD:]) / MA_PERIOD

def _wma(closes):
    if len(closes) < MA_PERIOD:
        return None
    window = closes[-MA_PERIOD:]
    w = list(range(1, MA_PERIOD + 1))
    return sum(p * wt for p, wt in zip(window, w)) / sum(w)

def on_init(ctx):
    ctx.param("ema_value", 0.0)
    ctx.param("ema_ready", False)
    ctx.param("above_cnt", 0)
    ctx.param("below_cnt", 0)
    # Trailing TP bookkeeping. entry_price is the close at the moment we
    # opened the current position (long or short); peak_price tracks the
    # best price reached since that entry; trailing_active flips True
    # once profit_pct crosses TP_ACT_PCT.
    ctx.param("entry_price", 0.0)
    ctx.param("peak_price", 0.0)
    ctx.param("trailing_active", False)

def _reset_trailing(ctx):
    ctx._params["entry_price"] = 0.0
    ctx._params["peak_price"] = 0.0
    ctx._params["trailing_active"] = False

def on_bar(ctx, bar):
    bars = ctx.bars(MA_PERIOD + 10)
    if len(bars) < MA_PERIOD:
        return

    closes = [b.close for b in bars]
    price = bar.close

    if MA_TYPE == "SMA":
        ma = _sma(closes)
    elif MA_TYPE == "WMA":
        ma = _wma(closes)
    else:
        ema_prev = ctx.param("ema_value", 0.0)
        ema_ok   = ctx.param("ema_ready", False)
        if not ema_ok:
            ma = sum(closes[-MA_PERIOD:]) / MA_PERIOD
            ctx._params["ema_value"] = ma
            ctx._params["ema_ready"] = True
        else:
            alpha = 2.0 / (MA_PERIOD + 1)
            ma = alpha * price + (1 - alpha) * ema_prev
            ctx._params["ema_value"] = ma

    if ma is None or ma <= 0:
        return

    above = ctx.param("above_cnt", 0)
    below = ctx.param("below_cnt", 0)

    if price > ma:
        above += 1
        below = 0
    elif price < ma:
        below += 1
        above = 0
    else:
        above = 0
        below = 0

    ctx._params["above_cnt"] = above
    ctx._params["below_cnt"] = below

    has_pos = ctx.position and float(ctx.position.get("size", 0)) > 0
    side = ctx.position.get("side", "") if has_pos else ""

    # If the position vanished (manual close, SL, etc) while trailing state
    # is still set, clear it so the next open starts fresh.
    if not has_pos and ctx.param("entry_price", 0.0) > 0:
        _reset_trailing(ctx)

    # ---- Trailing TP evaluation (runs before MA-based exit, so a trailing
    # exit can fire even if the MA hasn't crossed back yet — this is the
    # whole point: lock profit on a runaway move).
    if USE_TRAILING_TP and has_pos and side in ("long", "short"):
        entry_price     = ctx.param("entry_price", 0.0)
        peak_price      = ctx.param("peak_price", 0.0)
        trailing_active = ctx.param("trailing_active", False)

        # Backfill entry_price if missing (e.g. bot was created before the
        # trailing-TP upgrade and already had an open position).
        if entry_price <= 0:
            pe = 0.0
            try:
                pe = float(ctx.position.get("entry_price", 0) or 0)
            except Exception:
                pe = 0.0
            entry_price = pe if pe > 0 else price
            ctx._params["entry_price"] = entry_price

        if side == "long":
            if peak_price <= 0 or price > peak_price:
                peak_price = price
            profit_pct = (price - entry_price) / entry_price if entry_price > 0 else 0.0
        else:
            if peak_price <= 0 or price < peak_price:
                peak_price = price
            profit_pct = (entry_price - price) / entry_price if entry_price > 0 else 0.0
        ctx._params["peak_price"] = peak_price

        if not trailing_active and profit_pct >= TP_ACT_PCT:
            trailing_active = True
            ctx._params["trailing_active"] = True
            ctx.log("TRAILING TP ARMED side=%s @ %.6f entry=%.6f profit=%.2f%% peak=%.6f"
                    % (side, price, entry_price, profit_pct * 100, peak_price))

        if trailing_active and peak_price > 0:
            if side == "long":
                drawdown = (peak_price - price) / peak_price
            else:
                drawdown = (price - peak_price) / peak_price
            if drawdown >= TP_CB_PCT:
                ctx.log("TRAILING TP EXIT side=%s @ %.6f (peak=%.6f drawdown=%.2f%%)"
                        % (side, price, peak_price, drawdown * 100))
                ctx.close_position()
                _reset_trailing(ctx)
                return  # don't double-fire on this bar

    if DIRECTION in ("long", "both"):
        if not has_pos and above >= CONFIRM_BARS:
            amt = ctx.balance * POS_PCT
            if amt > 0:
                ctx.buy(price=price, amount=amt)
                ctx.log("LONG @ %.6f, MA=%.6f, above=%d" % (price, ma, above))
                # Seed trailing state for the fresh long.
                ctx._params["entry_price"] = price
                ctx._params["peak_price"] = price
                ctx._params["trailing_active"] = False
        elif has_pos and side == "long" and below >= CONFIRM_BARS:
            ctx.close_position()
            ctx.log("CLOSE LONG @ %.6f, MA=%.6f" % (price, ma))
            _reset_trailing(ctx)

    if DIRECTION in ("short", "both"):
        if not has_pos and below >= CONFIRM_BARS:
            amt = ctx.balance * POS_PCT
            if amt > 0:
                ctx.sell(price=price, amount=amt)
                ctx.log("SHORT @ %.6f, MA=%.6f, below=%d" % (price, ma, below))
                # Seed trailing state for the fresh short.
                ctx._params["entry_price"] = price
                ctx._params["peak_price"] = price
                ctx._params["trailing_active"] = False
        elif has_pos and side == "short" and above >= CONFIRM_BARS:
            ctx.close_position()
            ctx.log("CLOSE SHORT @ %.6f, MA=%.6f" % (price, ma))
            _reset_trailing(ctx)
`,

  dca: (params, context) => {
    const tf = (context && context.timeframe) || '1h'
    const tfMin = TIMEFRAME_MINUTES[tf] || 60
    const freqMin = params.frequency === 'every_bar' ? tfMin : (FREQUENCY_MINUTES[params.frequency] || 1440)

    return `# ---- DCA (Dollar Cost Averaging) Bot ----
import time as _time

AMT_EACH       = ${params.amountEach}
TOTAL_BUDGET   = ${params.totalBudget || 0}
DIP_BUY        = ${params.dipBuyEnabled ? 'True' : 'False'}
DIP_THRESHOLD  = ${params.dipThreshold || 5} / 100.0
INTERVAL_SEC   = ${freqMin * 60}

def on_init(ctx):
    ctx.param("total_spent", 0.0)
    ctx.param("total_qty", 0.0)
    ctx.param("buy_count", 0)
    ctx.param("last_buy_ts", 0)
    ctx.param("last_buy_price", 0.0)

def on_bar(ctx, bar):
    price       = bar.close
    total_spent = ctx.param("total_spent", 0.0)
    total_qty   = ctx.param("total_qty", 0.0)
    buy_count   = ctx.param("buy_count", 0)
    last_ts     = ctx.param("last_buy_ts", 0)
    last_price  = ctx.param("last_buy_price", 0.0)
    has_pos     = ctx.position and float(ctx.position.get("size", 0)) > 0
    now         = int(_time.time())

    if buy_count > 0 and total_qty > 0 and not has_pos:
        ctx.log("DCA position closed externally, resetting stats")
        total_spent = 0.0
        total_qty = 0.0
        buy_count = 0
        last_ts = 0
        last_price = 0.0
        ctx._params["total_spent"] = 0.0
        ctx._params["total_qty"] = 0.0
        ctx._params["buy_count"] = 0
        ctx._params["last_buy_ts"] = 0
        ctx._params["last_buy_price"] = 0.0

    budget_done = TOTAL_BUDGET > 0 and total_spent >= TOTAL_BUDGET
    if budget_done:
        return

    elapsed = now - last_ts
    due = (buy_count == 0) or (elapsed >= INTERVAL_SEC)
    if not due:
        return

    amount = AMT_EACH

    if DIP_BUY and last_price > 0:
        drop = (last_price - price) / last_price
        if drop >= DIP_THRESHOLD:
            amount = AMT_EACH * 2
            ctx.log("DIP detected (%.2f%%), doubling buy" % (drop * 100))

    if TOTAL_BUDGET > 0:
        remaining = TOTAL_BUDGET - total_spent
        if amount > remaining:
            amount = remaining
        if amount <= 0:
            return

    qty = amount / price if price > 0 else 0
    ctx.buy(price=price, amount=amount)
    ctx._params["total_spent"] = total_spent + amount
    ctx._params["total_qty"] = total_qty + qty
    ctx._params["buy_count"] = buy_count + 1
    ctx._params["last_buy_ts"] = now
    ctx._params["last_buy_price"] = price
    ctx.log("DCA #%d: BUY %.2f quote @ %.6f (total: %.2f)" % (buy_count + 1, amount, price, total_spent + amount))
`
  }
}

export function generateBotScript (botType, params, context) {
  const generator = BOT_SCRIPT_TEMPLATES[botType]
  if (!generator) {
    throw new Error(`Unknown bot type: ${botType}`)
  }
  return generator(params, context)
}

export function normalizeAiBotRecommendation(data, defaults = {}) {
  if (!data) return null
  if (data.bot_recommend && typeof data.bot_recommend === 'object') {
    return normalizeAiBotRecommendation(data.bot_recommend, defaults)
  }
  if (data.recommendation) return normalizeAiBotRecommendation(data.recommendation, defaults)
  if (data.data && (data.data.botType || data.data.strategyParams || data.data.bot_recommend || data.data.strategy_code || data.data.code)) {
    return normalizeAiBotRecommendation(data.data, defaults)
  }

  const scriptFrom =
    typeof data.strategy_code === 'string'
      ? data.strategy_code
      : typeof data.python_code === 'string'
        ? data.python_code
        : typeof data.source_code === 'string'
          ? data.source_code
          : ''
  const topCode = typeof data.code === 'string' ? data.code : ''
  const codeStr = (topCode && (topCode.includes('def on_init') || topCode.includes('def on_bar')) ? topCode : scriptFrom).trim()
  if (codeStr.length > 40 && (codeStr.includes('def on_init') || codeStr.includes('def on_bar'))) {
    const hs = data.debug?.human_summary
    const paramsObj = data.params && typeof data.params === 'object' && !Array.isArray(data.params) ? data.params : {}
    const botType = normalizeBotType(data.botType || data.bot_type || data.strategy_bot_type || 'grid')
    return {
      mode: 'script',
      strategy_code: codeStr,
      botType,
      botName: data.botName || data.strategy_name || data.strategyName || '',
      reason: hs?.title || hs?.returned_text || data.summary || data.analysis || '',
      strategyParams: normalizeBotParams(botType, paramsObj),
      riskConfig: normalizeRiskConfig(data.riskConfig || data.risk_config || data.trading_config || {}),
      baseConfig: {
        symbol: data.symbol || defaults.symbol || '',
        timeframe: data.timeframe || defaults.timeframe || '1m',
        marketCategory: data.marketCategory || data.market_category || defaults.marketCategory || 'Crypto',
        marketType: data.marketType || data.market_type || defaults.marketType || 'swap',
        leverage: data.leverage != null ? Number(data.leverage) : (defaults.leverage || 5),
        initialCapital: data.initialCapital || data.initial_capital || defaults.initialCapital || 1000
      },
      debugNote: data.debug?.auto_fix_applied && hs?.title
        ? hs.title + (hs.returned_text ? ` - ${hs.returned_text}` : '')
        : ''
    }
  }

  const botType = normalizeBotType(data.botType || data.bot_type || data.strategy_bot_type || 'grid')
  const rawBaseConfig = data.baseConfig || data.base_config || {}
  const baseConfig = {
    symbol: rawBaseConfig.symbol || data.symbol || defaults.symbol || '',
    timeframe: rawBaseConfig.timeframe || data.timeframe || defaults.timeframe || '1m',
    marketCategory: rawBaseConfig.marketCategory || rawBaseConfig.market_category || data.marketCategory || data.market_category || defaults.marketCategory || 'Crypto',
    marketType: rawBaseConfig.marketType || rawBaseConfig.market_type || data.marketType || data.market_type || defaults.marketType || 'swap',
    leverage: rawBaseConfig.leverage ?? data.leverage ?? defaults.leverage,
    initialCapital: rawBaseConfig.initialCapital || rawBaseConfig.initial_capital || data.initialCapital || data.initial_capital || defaults.initialCapital
  }
  const riskConfig = normalizeRiskConfig(data.riskConfig || data.risk_config || {
    stopLossPct: data.stopLossPct || data.stop_loss_pct,
    takeProfitPct: data.takeProfitPct || data.take_profit_pct,
    maxPosition: data.maxPosition || data.max_position,
    maxDailyLoss: data.maxDailyLoss || data.max_daily_loss,
    gridOobBufferPct: data.gridOobBufferPct || data.grid_oob_buffer_pct
  })

  return {
    botType,
    botName: data.botName || data.strategyName || data.strategy_name || '',
    reason: data.reason || data.analysis || data.ai_reason || data.summary || '',
    strategyParams: normalizeBotParams(botType, data.strategyParams || data.strategy_params || data.bot_params || data.params || {}),
    baseConfig,
    riskConfig
  }
}

function normalizeBotType(value) {
  const raw = String(value || '').trim().toLowerCase()
  const map = {
    grid_bot: 'grid',
    grid: 'grid',
    martingale_bot: 'martingale',
    martin: 'martingale',
    martingale: 'martingale',
    trend_bot: 'trend',
    trend_following: 'trend',
    trend: 'trend',
    dca_bot: 'dca',
    dca: 'dca'
  }
  return map[raw] || 'grid'
}

function normalizeRiskConfig(raw) {
  return normalizeKeys(raw || {}, {
    stop_loss_pct: 'stopLossPct',
    take_profit_pct: 'takeProfitPct',
    max_position: 'maxPosition',
    max_daily_loss: 'maxDailyLoss',
    grid_oob_buffer_pct: 'gridOobBufferPct'
  })
}

function normalizeBotParams(type, raw) {
  const aliases = {
    upper_price: 'upperPrice',
    lower_price: 'lowerPrice',
    grid_count: 'gridCount',
    amount_per_grid: 'amountPerGrid',
    grid_mode: 'gridMode',
    grid_direction: 'gridDirection',
    order_mode: 'orderMode',
    initial_position_pct: 'initialPositionPct',
    boundary_action: 'boundaryAction',
    adaptive_bounds: 'adaptiveBounds',
    adaptive_atr_mult: 'adaptiveAtrMult',
    waterfall_protection: 'waterfallProtection',
    waterfall_drop_pct: 'waterfallDropPct',
    initial_amount: 'initialAmount',
    max_layers: 'maxLayers',
    price_drop_pct: 'priceDropPct',
    take_profit_pct: 'takeProfitPct',
    stop_loss_pct: 'stopLossPct',
    trailing_tp_enabled: 'trailingTpEnabled',
    trailing_tp_activation_pct: 'trailingTpActivationPct',
    trailing_tp_callback_pct: 'trailingTpCallbackPct',
    ma_period: 'maPeriod',
    ma_type: 'maType',
    confirm_bars: 'confirmBars',
    position_pct: 'positionPct',
    amount_each: 'amountEach',
    total_budget: 'totalBudget',
    dip_buy_enabled: 'dipBuyEnabled',
    dip_threshold: 'dipThreshold'
  }
  const normalized = normalizeKeys(raw || {}, aliases)
  if (normalized.waterfallDropPct != null && normalized.waterfallDropPct !== '') {
    normalized.waterfallDropPct = ratioOrPercentToUiPercent(normalized.waterfallDropPct)
  }
  const allowed = {
    grid: ['upperPrice', 'lowerPrice', 'gridCount', 'amountPerGrid', 'gridMode', 'gridDirection', 'orderMode', 'initialPositionPct', 'boundaryAction', 'adaptiveBounds', 'adaptiveAtrMult', 'waterfallProtection', 'waterfallDropPct'],
    martingale: ['multiplier', 'maxLayers', 'priceDropPct', 'takeProfitPct', 'stopLossPct', 'direction', 'trailingTpEnabled', 'trailingTpCallbackPct', 'waterfallProtection', 'waterfallDropPct'],
    trend: ['maPeriod', 'maType', 'confirmBars', 'positionPct', 'direction', 'trailingTpEnabled', 'trailingTpActivationPct', 'trailingTpCallbackPct'],
    dca: ['amountEach', 'frequency', 'totalBudget', 'dipBuyEnabled', 'dipThreshold']
  }[type] || []
  const out = {}
  allowed.forEach((key) => {
    if (normalized[key] != null) out[key] = normalized[key]
  })
  return out
}

function normalizeKeys(raw, aliases) {
  const out = {}
  Object.entries(raw || {}).forEach(([key, val]) => {
    const mapped = aliases[key] || key
    out[mapped] = normalizeValue(mapped, val)
  })
  return out
}

function normalizeValue(key, val) {
  if (['adaptiveBounds', 'waterfallProtection', 'trailingTpEnabled', 'dipBuyEnabled'].includes(key)) {
    if (typeof val === 'boolean') return val
    return ['true', '1', 'yes', 'on'].includes(String(val).toLowerCase())
  }
  if (val === '' || val == null) return val
  const numericKeys = [
    'upperPrice', 'lowerPrice', 'gridCount', 'amountPerGrid', 'initialPositionPct',
    'adaptiveAtrMult', 'waterfallDropPct', 'multiplier', 'maxLayers', 'priceDropPct',
    'takeProfitPct', 'stopLossPct', 'trailingTpActivationPct', 'trailingTpCallbackPct',
    'maPeriod', 'confirmBars', 'positionPct', 'amountEach', 'totalBudget', 'dipThreshold',
    'maxPosition', 'maxDailyLoss', 'gridOobBufferPct', 'leverage', 'initialCapital'
  ]
  if (numericKeys.includes(key)) {
    const n = Number(val)
    return Number.isFinite(n) ? n : val
  }
  return val
}

function ratioOrPercentToUiPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return value
  if (n > 0 && n <= 1) return +(n * 100).toFixed(4)
  return n
}
