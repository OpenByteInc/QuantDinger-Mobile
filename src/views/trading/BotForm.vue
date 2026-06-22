<template>
  <div class="page">
    <van-nav-bar :title="$t('bot_create.title')" left-arrow @click-left="$router.back()" />

    <!-- Wizard step indicator (mirrors PC BotCreateWizard 4-step layout) -->
    <div class="wizard-steps">
      <div
        v-for="(step, idx) in wizardSteps"
        :key="step.key"
        :class="['ws-item', { active: idx === currentStep, done: idx < currentStep }]"
        @click="onWizardStepTap(idx)"
      >
        <div class="ws-dot">
          <van-icon v-if="idx < currentStep" name="success" />
          <span v-else>{{ idx + 1 }}</span>
        </div>
        <span class="ws-text">{{ step.label }}</span>
        <span v-if="idx < wizardSteps.length - 1" class="ws-line" :class="{ done: idx < currentStep }"></span>
      </div>
    </div>

    <div v-if="aiScriptBanner" class="ai-banner script">
      <van-icon name="description" />
      <span>{{ aiScriptBanner }}</span>
    </div>
    <div v-else-if="aiReason" class="ai-banner">
      <van-icon name="fire-o" />
      <span>{{ aiReason }}</span>
    </div>
    <div v-if="isEditMode" class="ai-banner edit">
      <van-icon name="edit" />
      <span>{{ $t('bot_create.edit_banner') }}</span>
    </div>

    <div class="segmented" :class="{ 'segmented--locked': !!aiStrategyCode || isEditMode }">
      <div
        v-for="opt in botTypes"
        :key="opt.value"
        :class="['seg', { active: botType === opt.value }]"
        @click="onTypeChange(opt.value)"
      >
        <div class="seg-title">{{ opt.title }}</div>
        <div class="seg-desc">{{ opt.desc }}</div>
      </div>
    </div>

    <div class="section" ref="sectionBase">
      <div class="section-title">{{ $t('bot_create.base_config') }}</div>
      <van-cell-group inset>
        <van-field
          v-model="form.botName"
          :label="$t('bot_create.bot_name')"
          :placeholder="$t('bot_create.bot_name_placeholder')"
        />
        <van-cell :title="$t('bot_create.exchange_account')" :value="credentialLabel" is-link @click="openCredentialPicker" />
        <van-cell
          :title="$t('quick_trade.symbol')"
          :value="form.symbol || $t('watchlist.tap_to_select')"
          is-link
          @click="showSymbolPicker = true"
        />
        <van-cell v-if="!isGridOrMartingale" :title="$t('bot_create.timeframe')" :value="form.timeframe" is-link @click="showTfPicker = true" />
        <van-cell v-else :title="$t('bot_create.timeframe')" :value="'Tick'" />
        <van-cell :title="$t('bot_create.market_type')">
          <template #right-icon>
            <van-radio-group v-model="form.marketType" direction="horizontal">
              <van-radio name="swap">{{ $t('bot_create.market_type_swap') }}</van-radio>
              <van-radio name="spot">{{ $t('bot_create.market_type_spot') }}</van-radio>
            </van-radio-group>
          </template>
        </van-cell>
        <van-field
          v-if="form.marketType === 'swap'"
          v-model.number="form.leverage"
          type="digit"
          :label="$t('bot_create.leverage')"
          placeholder="5"
        />
        <van-field
          v-model.number="form.initialCapital"
          type="number"
          :label="$t('bot_create.initial_capital')"
          placeholder="1000"
        />
      </van-cell-group>
    </div>

    <div class="section" ref="sectionStrategy">
      <div class="section-title">{{ $t('bot_create.strategy_params') }}</div>
      <van-cell-group inset>
        <template v-if="botType === 'grid'">
          <van-field v-model.number="p.grid.upperPrice" type="number" :label="$t('bot_create.upper_price')" />
          <van-field v-model.number="p.grid.lowerPrice" type="number" :label="$t('bot_create.lower_price')" />
          <van-field v-model.number="p.grid.gridCount" type="digit" :label="$t('bot_create.grid_count')" />
          <van-field
            v-model.number="p.grid.amountPerGrid"
            type="number"
            :label="$t('bot_create.amount_per_grid')"
            @update:model-value="onAmountPerGridManualChange"
          >
            <template #extra v-if="gridCapitalLinked && form.initialCapital">
              <van-icon name="link-o" class="auto-tip-icon" />
            </template>
          </van-field>
          <div v-if="gridCapitalLinked && form.initialCapital" class="field-hint">
            {{ $t('bot_create.grid_auto_calc_hint') }}
          </div>

          <van-cell :title="$t('bot_create.grid_mode')">
            <template #right-icon>
              <van-radio-group v-model="p.grid.gridMode" direction="horizontal">
                <van-radio name="arithmetic">{{ $t('bot_create.grid_mode_arithmetic') }}</van-radio>
                <van-radio name="geometric">{{ $t('bot_create.grid_mode_geometric') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>

          <van-cell :title="$t('bot_create.grid_direction')">
            <template #right-icon>
              <van-radio-group v-model="p.grid.gridDirection" direction="horizontal">
                <van-radio name="neutral" :disabled="isSpotMarket">{{ $t('bot_create.grid_direction_neutral') }}</van-radio>
                <van-radio name="long">{{ $t('bot_create.grid_direction_long') }}</van-radio>
                <van-radio name="short" :disabled="isSpotMarket">{{ $t('bot_create.grid_direction_short') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="field-hint">{{ gridDirectionHint }}</div>

          <van-cell :title="$t('bot_create.grid_order_mode')">
            <template #right-icon>
              <van-radio-group v-model="p.grid.orderMode" direction="horizontal">
                <van-radio name="maker">{{ $t('bot_create.grid_order_maker') }}</van-radio>
                <van-radio name="market">{{ $t('bot_create.grid_order_market') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="field-hint">{{ gridOrderModeHint }}</div>

          <div
            v-if="p.grid.upperPrice && p.grid.lowerPrice && p.grid.gridCount"
            class="grid-summary"
          >
            <div class="summary-row">
              <span class="summary-label">{{ $t('bot_create.grid_spacing') }}</span>
              <span class="summary-value">{{ gridSpacing }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">{{ $t('bot_create.grid_total_invest') }}</span>
              <span class="summary-value">${{ gridTotalInvest }}</span>
            </div>
          </div>
        </template>
        <template v-else-if="botType === 'martingale'">
          <van-field
            :model-value="form.initialCapital"
            readonly
            type="number"
            :label="$t('bot_create.martingale_total_budget')"
          />
          <div class="field-hint">{{ $t('bot_create.martingale_total_budget_hint') }}</div>
          <van-field
            :model-value="martingaleFirstOrder"
            readonly
            type="number"
            :label="$t('bot_create.martingale_first_order')"
          />
          <div class="field-hint">{{ $t('bot_create.martingale_first_order_hint') }}</div>
          <van-field v-model.number="p.martingale.multiplier" type="number" :label="$t('bot_create.multiplier')" />
          <van-field v-model.number="p.martingale.maxLayers" type="digit" :label="$t('bot_create.max_layers')" />
          <div class="field-hint">{{ $t('bot_create.max_layers_hint') }}</div>
          <van-field v-model.number="p.martingale.priceDropPct" type="number" :label="$t('bot_create.price_drop_pct')" />
          <van-field v-model.number="p.martingale.takeProfitPct" type="number" :label="$t('bot_create.martingale_take_profit_pct')" />
          <div class="field-hint">{{ $t('bot_create.martingale_take_profit_hint') }}</div>
          <van-field v-model.number="p.martingale.stopLossPct" type="number" :label="$t('bot_create.martingale_stop_loss_pct')" />
          <div class="field-hint">{{ $t('bot_create.martingale_stop_loss_hint') }}</div>
          <van-cell :title="$t('bot_create.direction')">
            <template #right-icon>
              <van-radio-group v-model="p.martingale.direction" direction="horizontal">
                <van-radio name="long">{{ $t('bot_create.direction_long') }}</van-radio>
                <van-radio name="short" :disabled="isSpotMarket">{{ $t('bot_create.direction_short') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="field-hint">{{ martingaleDirectionHint }}</div>
          <div
            v-if="martingaleFirstOrder > 0 && p.martingale.multiplier && p.martingale.maxLayers"
            class="strategy-summary martingale"
          >
            <div class="summary-row">
              <span class="summary-label">{{ $t('bot_create.martingale_total_budget') }}</span>
              <span class="summary-value">${{ martingaleMaxInvestment }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">{{ $t('bot_create.martingale_first_order') }}</span>
              <span class="summary-value">${{ martingaleFirstOrder.toFixed(2) }}</span>
            </div>
            <div class="summary-row">
              <span class="summary-label">{{ $t('bot_create.martingale_last_layer') }}</span>
              <span class="summary-value">${{ martingaleLastLayerAmount }}</span>
            </div>
          </div>
        </template>
        <template v-else-if="botType === 'trend'">
          <van-field v-model.number="p.trend.maPeriod" type="digit" :label="$t('bot_create.ma_period')" />
          <van-cell :title="$t('bot_create.ma_type')">
            <template #right-icon>
              <van-radio-group v-model="p.trend.maType" direction="horizontal">
                <van-radio name="SMA">SMA</van-radio>
                <van-radio name="EMA">EMA</van-radio>
                <van-radio name="WMA">WMA</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <van-field v-model.number="p.trend.confirmBars" type="digit" :label="$t('bot_create.confirm_bars')" />
          <van-field v-model.number="p.trend.positionPct" type="number" :label="$t('bot_create.position_pct')" />
          <van-cell :title="$t('bot_create.direction')">
            <template #right-icon>
              <van-radio-group v-model="p.trend.direction" direction="horizontal">
                <van-radio name="long">{{ $t('bot_create.direction_long') }}</van-radio>
                <van-radio name="short" :disabled="isSpotMarket">{{ $t('bot_create.direction_short') }}</van-radio>
                <van-radio name="both" :disabled="isSpotMarket">{{ $t('bot_create.direction_both') }}</van-radio>
              </van-radio-group>
            </template>
          </van-cell>
          <div class="field-hint">{{ trendDirectionHint }}</div>
        </template>
        <template v-else-if="botType === 'dca'">
          <van-field
            v-model.number="p.dca.amountEach"
            type="number"
            :label="$t('bot_create.amount_each')"
            @update:model-value="onDcaAmountManualChange"
          />
          <van-cell :title="$t('bot_create.frequency')" :value="frequencyLabel" is-link @click="showFreqPicker = true" />
          <van-field
            v-model.number="p.dca.totalBudget"
            type="number"
            :label="$t('bot_create.total_budget')"
            @update:model-value="onDcaBudgetManualChange"
          >
            <template #extra v-if="dcaCapitalLinked && form.initialCapital">
              <van-icon name="link-o" class="auto-tip-icon" />
            </template>
          </van-field>
          <div v-if="dcaCapitalLinked && form.initialCapital" class="field-hint">
            {{ $t('bot_create.dca_budget_linked_hint') }}
          </div>
          <van-cell :title="$t('bot_create.dca_dip_buy')" center>
            <template #right-icon>
              <van-switch v-model="p.dca.dipBuyEnabled" size="20" />
            </template>
          </van-cell>
          <div class="field-hint">{{ $t('bot_create.dca_dip_buy_hint') }}</div>
          <van-field
            v-if="p.dca.dipBuyEnabled"
            v-model.number="p.dca.dipThreshold"
            type="number"
            :label="$t('bot_create.dca_dip_threshold')"
          />
          <div
            v-if="p.dca.amountEach && p.dca.frequency"
            class="strategy-summary dca"
          >
            <div class="summary-row">
              <span class="summary-label">{{ $t('bot_create.dca_estimated_runs') }}</span>
              <span class="summary-value">{{ dcaEstimatedRuns }}</span>
            </div>
          </div>
        </template>
      </van-cell-group>
    </div>

    <div class="section" ref="sectionRisk">
      <div class="section-title">{{ $t('bot_create.risk_params') }}</div>
      <van-cell-group inset>
        <template v-if="botType !== 'martingale'">
          <van-field v-model.number="form.stopLossPct" type="number" :label="$t('bot_create.stop_loss_pct')" />
          <van-field v-model.number="form.takeProfitPct" type="number" :label="$t('bot_create.take_profit_pct')" />
          <van-field
            v-model.number="form.maxPosition"
            type="number"
            :label="$t('bot_create.max_position')"
            @update:model-value="maxPositionDirty = true"
          />
          <div class="field-hint">{{ $t('bot_create.max_position_hint') }}</div>
        </template>
        <van-field
          v-model.number="form.maxDailyLoss"
          type="number"
          :label="$t('bot_create.max_daily_loss')"
          @update:model-value="maxDailyLossDirty = true"
        />
        <div class="field-hint">{{ $t('bot_create.max_daily_loss_hint') }}</div>
        <template v-if="botType === 'grid' || botType === 'dca'">
          <van-field
            v-model.number="form.gridOobBufferPct"
            type="number"
            :label="$t('bot_create.grid_oob_buffer_pct')"
          />
          <div class="field-hint">{{ $t('bot_create.grid_oob_buffer_hint') }}</div>
        </template>
      </van-cell-group>
    </div>

    <!-- Step 4 / Confirm summary (parity with PC wizard's last step) -->
    <div class="section" ref="sectionConfirm">
      <div class="section-title">{{ $t('bot_create.confirm') }}</div>
      <div class="confirm-card">
        <div class="confirm-row">
          <span class="confirm-label">{{ $t('bot_create.bot_name') }}</span>
          <span class="confirm-value">{{ form.botName || '-' }}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">{{ $t('quick_trade.symbol') }}</span>
          <span class="confirm-value">{{ form.symbol || '-' }}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">{{ $t('bot_create.timeframe') }}</span>
          <span class="confirm-value">{{ isGridOrMartingale ? 'Tick' : form.timeframe }}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">{{ $t('bot_create.market_type') }}</span>
          <span class="confirm-value">
            {{ form.marketType === 'swap' ? $t('bot_create.market_type_swap') : $t('bot_create.market_type_spot') }}
            <span v-if="form.marketType === 'swap'" class="leverage-chip">{{ form.leverage }}x</span>
          </span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">{{ $t('bot_create.initial_capital') }}</span>
          <span class="confirm-value">${{ Number(form.initialCapital || 0).toLocaleString('en-US') }}</span>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">{{ $t('trading.bot_type') }}</span>
          <span class="confirm-value">{{ currentBotTypeLabel }}</span>
        </div>
      </div>
    </div>

    <div class="submit-wrap">
      <van-button
        type="primary"
        block
        round
        :loading="submitting"
        :loading-text="isEditMode ? $t('bot_create.updating') : $t('bot_create.creating')"
        @click="submit"
      >{{ isEditMode ? $t('bot_create.update') : $t('bot_create.submit') }}</van-button>
    </div>

    <van-popup v-model:show="showCredentialPicker" position="bottom" round>
      <van-picker
        :columns="credentialColumns"
        @cancel="showCredentialPicker = false"
        @confirm="onCredentialSelect"
      />
    </van-popup>

    <van-popup v-model:show="showTfPicker" position="bottom" round>
      <van-picker
        :columns="timeframeColumns"
        @cancel="showTfPicker = false"
        @confirm="onTfSelect"
      />
    </van-popup>

    <van-popup v-model:show="showFreqPicker" position="bottom" round>
      <van-picker
        :columns="frequencyColumns"
        @cancel="showFreqPicker = false"
        @confirm="onFreqSelect"
      />
    </van-popup>

    <SymbolPicker
      v-model:show="showSymbolPicker"
      :only-crypto="true"
      :title="$t('watchlist.picker_title')"
      @pick="onPickSymbol"
    />
  </div>
</template>

<script>
import { showToast } from 'vant'
import { credentialsApi, marketApi, strategyApi } from '@/api'
import { useCredentialsStore } from '@/stores'
import { generateBotScript } from './botScriptTemplates'
import SymbolPicker from '@/components/SymbolPicker.vue'

const DEFAULT_PARAMS = () => ({
  grid: {
    upperPrice: 0,
    lowerPrice: 0,
    gridCount: 10,
    amountPerGrid: 0,
    gridMode: 'arithmetic',
    gridDirection: 'neutral',
    orderMode: 'maker',
    initialPositionPct: 0,
    boundaryAction: 'pause',
    adaptiveBounds: true,
    adaptiveAtrMult: 2,
    waterfallProtection: true,
    waterfallDropPct: 3
  },
  martingale: {
    multiplier: 2,
    maxLayers: 5,
    priceDropPct: 3,
    takeProfitPct: 2,
    stopLossPct: 12,
    direction: 'long',
    trailingTpEnabled: false,
    trailingTpCallbackPct: 0.8,
    waterfallProtection: true,
    waterfallDropPct: 4
  },
  trend: {
    maPeriod: 20,
    maType: 'EMA',
    confirmBars: 2,
    positionPct: 50,
    direction: 'long',
    trailingTpEnabled: false,
    trailingTpActivationPct: 5,
    trailingTpCallbackPct: 1
  },
  dca: {
    amountEach: 0,
    frequency: 'daily',
    totalBudget: 0,
    dipBuyEnabled: false,
    dipThreshold: 5
  }
})

export default {
  name: 'BotForm',
  components: { SymbolPicker },
  props: {
    preset: {
      type: Object,
      default: null
    }
  },
  data() {
    return {
      botType: 'grid',
      form: {
        botName: '',
        credentialId: null,
        symbol: '',
        timeframe: '1h',
        marketType: 'swap',
        leverage: 5,
        initialCapital: 1000,
        stopLossPct: 10,
        takeProfitPct: 20,
        maxPosition: 0,
        maxDailyLoss: 0,
        gridOobBufferPct: 5
      },
      p: DEFAULT_PARAMS(),
      showCredentialPicker: false,
      showSymbolPicker: false,
      showTfPicker: false,
      showFreqPicker: false,
      submitting: false,
      aiReason: '',
      /** Read from ?edit=<id> — hydrate from existing strategy */
      editId: null,
      editing: null,
      /** Current visual step in the 4-step wizard indicator (0-3) */
      currentStep: 0,
      scrollHandler: null,
      /** AI 接口返回的 Python ScriptStrategy 源码（经 sessionStorage 传入） */
      aiStrategyCode: '',
      /** 每格金额是否与总投入金额联动自动计算 */
      gridCapitalLinked: true,
      /** DCA 总预算是否与投入本金联动 */
      dcaCapitalLinked: true,
      /** maxPosition 是否由用户手动改过（true 时不再自动与 initialCapital 联动） */
      maxPositionDirty: false,
      /** maxDailyLoss 是否由用户手动改过 */
    maxDailyLossDirty: false
    }
  },
  computed: {
    aiScriptBanner() {
      if (!this.aiStrategyCode?.trim()) return ''
      return this.$t('bot_create.ai_script_form_banner')
    },
    botTypes() {
      return [
        { value: 'grid', title: this.$t('bot_create.type_grid'), desc: this.$t('bot_create.type_grid_desc') },
        { value: 'martingale', title: this.$t('bot_create.type_martingale'), desc: this.$t('bot_create.type_martingale_desc') },
        { value: 'trend', title: this.$t('bot_create.type_trend'), desc: this.$t('bot_create.type_trend_desc') },
        { value: 'dca', title: this.$t('bot_create.type_dca'), desc: this.$t('bot_create.type_dca_desc') }
      ]
    },
    credentialsStore() { return useCredentialsStore() },
    credentials() { return this.credentialsStore.items },
    currentCredential() {
      return this.credentials.find((i) => i.id === this.form.credentialId) || null
    },
    currentExchangeId() {
      return String(this.currentCredential?.exchange_id || '').toLowerCase()
    },
    credentialColumns() {
      // PC parity: show "<name> (<exchange> · <api_key_hint>)" so the
      // user can disambiguate two credentials on the same exchange.
      return this.credentials.map((c) => {
        const label = c.name || c.exchange_id
        const ex = (c.exchange_id || '').toUpperCase()
        const hint = c.api_key_hint ? ` · ${c.api_key_hint}` : ''
        return {
          text: `${label} (${ex}${hint})`,
          value: c.id
        }
      })
    },
    credentialLabel() {
      const c = this.credentials.find((i) => i.id === this.form.credentialId)
      if (!c) return this.$t('bot_create.exchange_account_placeholder')
      const label = c.name || c.exchange_id
      const ex = (c.exchange_id || '').toUpperCase()
      const hint = c.api_key_hint ? ` · ${c.api_key_hint}` : ''
      return `${label} (${ex}${hint})`
    },
    currentBotTypeLabel() {
      const opt = this.botTypes.find((o) => o.value === this.botType)
      return opt ? opt.title : this.botType
    },
    wizardSteps() {
      return [
        { key: 'base', label: this.$t('bot_create.step_base') },
        { key: 'strategy', label: this.$t('bot_create.step_strategy') },
        { key: 'risk', label: this.$t('bot_create.step_risk') },
        { key: 'confirm', label: this.$t('bot_create.step_confirm') }
      ]
    },
    isEditMode() {
      return !!this.editId
    },
    timeframeColumns() {
      return ['1m', '5m', '15m', '1h', '4h', '1d'].map((v) => ({ value: v, text: v }))
    },
    frequencyColumns() {
      return [
        { value: 'every_bar', text: 'Every Bar' },
        { value: 'hourly', text: 'Hourly' },
        { value: '4h', text: '4 Hours' },
        { value: 'daily', text: 'Daily' },
        { value: 'weekly', text: 'Weekly' },
        { value: 'biweekly', text: 'Biweekly' },
        { value: 'monthly', text: 'Monthly' }
      ]
    },
    frequencyLabel() {
      const it = this.frequencyColumns.find((o) => o.value === this.p.dca.frequency)
      return it ? it.text : this.p.dca.frequency
    },
    isGridOrMartingale() {
      return this.botType === 'grid' || this.botType === 'martingale'
    },
    isSpotMarket() {
      return this.form.marketType === 'spot'
    },
    gridSpacing() {
      const g = this.p.grid
      if (!g.upperPrice || !g.lowerPrice || !g.gridCount) return '--'
      if (g.gridMode === 'geometric' && g.lowerPrice > 0) {
        const ratio = Math.pow(g.upperPrice / g.lowerPrice, 1 / g.gridCount)
        return `${((ratio - 1) * 100).toFixed(2)}%`
      }
      const spacing = (g.upperPrice - g.lowerPrice) / g.gridCount
      return `$${spacing.toFixed(4)}`
    },
    gridTotalInvest() {
      const g = this.p.grid
      if (!g.amountPerGrid || !g.gridCount) return '0'
      return (g.amountPerGrid * g.gridCount).toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
    gridDirectionHint() {
      if (this.isSpotMarket) return this.$t('bot_create.grid_direction_spot_hint')
      const map = {
        neutral: this.$t('bot_create.grid_direction_neutral_hint'),
        long: this.$t('bot_create.grid_direction_long_hint'),
        short: this.$t('bot_create.grid_direction_short_hint')
      }
      return map[this.p.grid.gridDirection] || ''
    },
    gridOrderModeHint() {
      return this.p.grid.orderMode === 'maker'
        ? this.$t('bot_create.grid_order_maker_hint')
        : this.$t('bot_create.grid_order_market_hint')
    },
    /** 马丁首单金额（按总投入 ÷ Σ(multiplier^i) 反推） */
    martingaleFirstOrder() {
      const capital = Number(this.form.initialCapital) || 0
      const m = Number(this.p.martingale.multiplier) || 2
      const layers = Number(this.p.martingale.maxLayers) || 5
      if (capital <= 0 || m <= 1 || layers <= 0) return 0
      let geoSum = 0
      for (let i = 0; i < layers; i++) geoSum += Math.pow(m, i)
      if (geoSum <= 0) return 0
      return Math.max(0, Math.floor((capital / geoSum) * 100) / 100)
    },
    martingaleMaxInvestment() {
      const m = Number(this.p.martingale.multiplier) || 2
      const layers = Number(this.p.martingale.maxLayers) || 5
      let total = 0
      let amt = this.martingaleFirstOrder
      for (let i = 0; i < layers; i++) {
        total += amt
        amt *= m
      }
      return total.toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
    martingaleLastLayerAmount() {
      const m = Number(this.p.martingale.multiplier) || 2
      const layers = Number(this.p.martingale.maxLayers) || 5
      const amt = this.martingaleFirstOrder * Math.pow(m, layers - 1)
      return amt.toLocaleString('en-US', { minimumFractionDigits: 2 })
    },
    martingaleDirectionHint() {
      if (this.isSpotMarket) return this.$t('bot_create.grid_direction_spot_hint')
      return this.p.martingale.direction === 'long'
        ? this.$t('bot_create.martingale_long_hint')
        : this.$t('bot_create.martingale_short_hint')
    },
    trendDirectionHint() {
      if (this.isSpotMarket) return this.$t('bot_create.grid_direction_spot_hint')
      const map = {
        long: this.$t('bot_create.trend_long_hint'),
        short: this.$t('bot_create.trend_short_hint'),
        both: this.$t('bot_create.trend_both_hint')
      }
      return map[this.p.trend.direction] || ''
    },
    /** DCA 预计执行次数 */
    dcaEstimatedRuns() {
      const budget = Number(this.p.dca.totalBudget) || 0
      const each = Number(this.p.dca.amountEach) || 0
      if (budget <= 0) return this.$t('bot_create.dca_unlimited')
      if (each <= 0) return '--'
      return `${Math.floor(budget / each)} ${this.$t('bot_create.dca_times')}`
    }
  },
  watch: {
    'form.initialCapital'(val) {
      const capital = Number(val) || 0
      if (capital > 0) {
        if (this.gridCapitalLinked && this.p.grid.gridCount > 0) {
          this.p.grid.amountPerGrid = Math.floor(capital / this.p.grid.gridCount)
        }
        if (this.dcaCapitalLinked) {
          this.p.dca.totalBudget = capital
          if (!this.p.dca.amountEach || this.p.dca.amountEach <= 0) {
            this.p.dca.amountEach = Math.max(1, Math.round(capital / 30))
          }
        }
        if (!this.maxPositionDirty && this.botType !== 'martingale') {
          this.form.maxPosition = capital
        }
        if (!this.maxDailyLossDirty) {
          this.form.maxDailyLoss = Math.round(capital * 0.1)
        }
      }
    },
    'p.grid.gridCount'(val) {
      const capital = Number(this.form.initialCapital) || 0
      if (this.gridCapitalLinked && capital > 0 && val > 0) {
        this.p.grid.amountPerGrid = Math.floor(capital / val)
      }
    },
    'form.marketType': {
      immediate: false,
      handler(val) {
        if (val === 'spot') {
          if (this.p.grid.gridDirection !== 'long') this.p.grid.gridDirection = 'long'
          if (this.p.martingale.direction !== 'long') this.p.martingale.direction = 'long'
          if (this.p.trend.direction !== 'long') this.p.trend.direction = 'long'
        }
      }
    }
  },
  async mounted() {
    await this.loadCredentials()
    this.applyPreset()
    await this.hydrateFromPresetQuery()
    await this.hydrateFromEditQuery()
    if (!this.form.credentialId && this.credentials.length > 0) {
      this.form.credentialId = this.credentials[0].id
    }
    this.scrollHandler = this.updateCurrentStep.bind(this)
    window.addEventListener('scroll', this.scrollHandler, { passive: true })
    this.$nextTick(() => this.updateCurrentStep())
  },
  beforeUnmount() {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler)
    }
  },
  methods: {
    onPickSymbol(item) {
      this.form.symbol = item?.symbol || ''
    },
    /**
     * Compute which "step" the user is currently looking at by
     * measuring the offset of each anchored section against the
     * viewport. We update `currentStep` so the wizard pill at the top
     * stays in sync without forcing the user through a real
     * multi-screen flow (mobile UX prefers one long form).
     */
    updateCurrentStep() {
      const refs = ['sectionBase', 'sectionStrategy', 'sectionRisk', 'sectionConfirm']
      const viewportMid = window.innerHeight * 0.35
      let step = 0
      refs.forEach((name, idx) => {
        const el = this.$refs[name]
        if (!el) return
        const rect = el.getBoundingClientRect()
        if (rect.top <= viewportMid) step = idx
      })
      this.currentStep = step
    },
    onWizardStepTap(idx) {
      const refs = ['sectionBase', 'sectionStrategy', 'sectionRisk', 'sectionConfirm']
      const el = this.$refs[refs[idx]]
      if (!el) return
      const top = el.getBoundingClientRect().top + window.pageYOffset - 56
      window.scrollTo({ top, behavior: 'smooth' })
    },
    applyStrategyDetail(detail, { editId = null } = {}) {
      if (!detail) return
      if (editId) {
        this.editId = editId
        this.editing = detail
      }
      const tc = detail.trading_config || {}
      const ec = detail.exchange_config || {}
      this.form.botName = detail.strategy_name || detail.name || this.form.botName
      if (ec.credential_id != null) this.form.credentialId = ec.credential_id
      if (tc.symbol) this.form.symbol = tc.symbol
      if (tc.timeframe) this.form.timeframe = tc.timeframe
      if (tc.market_type) this.form.marketType = tc.market_type
      if (tc.leverage) this.form.leverage = Number(tc.leverage) || this.form.leverage
      if (tc.initial_capital) this.form.initialCapital = Number(tc.initial_capital) || this.form.initialCapital
      if (tc.stop_loss_pct != null) {
        this.form.stopLossPct = Number(tc.stop_loss_pct) || 0
      }
      if (tc.take_profit_pct != null) {
        this.form.takeProfitPct = Number(tc.take_profit_pct) || 0
      }
      if (tc.max_position != null) {
        this.form.maxPosition = Number(tc.max_position) || 0
        this.maxPositionDirty = true
      }
      if (tc.max_daily_loss != null) {
        this.form.maxDailyLoss = Number(tc.max_daily_loss) || 0
        this.maxDailyLossDirty = true
      }
      if (tc.grid_oob_buffer_pct != null) {
        this.form.gridOobBufferPct = Number(tc.grid_oob_buffer_pct) || 0
      }
      const inferredType = tc.bot_type || detail.bot_type
      if (inferredType && DEFAULT_PARAMS()[inferredType]) {
        this.botType = inferredType
      }
      const params = tc.bot_params || {}
      const target = this.p[this.botType]
      if (target && params && typeof params === 'object') {
        Object.entries(params).forEach(([k, v]) => {
          if (v != null && k in target) target[k] = v
        })
      }
    },
    async hydrateFromPresetQuery() {
      if (this.$route.query?.edit) return
      let presetId = Number(this.$route.query?.preset_strategy_id || this.$route.query?.strategy_id || 0)
      if ((!presetId || !Number.isFinite(presetId)) && this.$route.query?.source_indicator_id) {
        try {
          const res = await marketApi.syncIndicator(this.$route.query.source_indicator_id)
          presetId = Number(res?.data?.strategy_id || res?.data?.purchased_strategy_id || 0)
        } catch {
          presetId = 0
        }
      }
      if (!presetId || !Number.isFinite(presetId)) return
      try {
        const res = await strategyApi.getDetail(presetId)
        const detail = res?.data
        if (!detail) return
        this.applyStrategyDetail(detail)
        this.aiReason = this.$t('bot_create.preset_loaded')
      } catch (err) {
        console.warn('Hydrate preset failed:', err)
      }
    },
    async hydrateFromEditQuery() {
      const editId = Number(this.$route.query?.edit)
      if (!editId || !Number.isFinite(editId)) return
      try {
        const res = await strategyApi.getDetail(editId)
        const detail = res?.data
        if (!detail) return
        this.applyStrategyDetail(detail, { editId })
      } catch (err) {
        console.warn('Hydrate edit failed:', err)
      }
    },
    onAmountPerGridManualChange() {
      this.gridCapitalLinked = false
    },
    onDcaBudgetManualChange() {
      this.dcaCapitalLinked = false
    },
    onDcaAmountManualChange() {
      // 用户手动填写单次金额本身不解除联动（联动只影响 totalBudget）
    },
    async loadCredentials() {
      try {
        const res = await credentialsApi.list()
        this.credentialsStore.setItems(res.data || [])
      } catch {
        this.credentialsStore.setItems([])
      }
    },
    applyPreset() {
      let parsed = null

      const fromAi =
        this.$route.query?.fromAi === '1' || this.$route.query?.fromAiScript === '1'
      if (fromAi) {
        try {
          const code = sessionStorage.getItem('qd_ai_strategy_code')
          const metaRaw = sessionStorage.getItem('qd_ai_strategy_preset')
          if (code) {
            this.aiStrategyCode = code
            sessionStorage.removeItem('qd_ai_strategy_code')
          }
          if (metaRaw) {
            parsed = JSON.parse(metaRaw)
            sessionStorage.removeItem('qd_ai_strategy_preset')
          }
        } catch {
          /* ignore */
        }
      }

      if (!parsed) {
        const preset = this.preset || this.$route.query?.preset
        if (typeof preset === 'string') {
          try { parsed = JSON.parse(preset) } catch { parsed = null }
        } else if (preset && typeof preset === 'object') {
          parsed = preset
        }
      }
      if (!parsed) return
      parsed = this.normalizeIncomingPreset(parsed)

      if (parsed.botType && DEFAULT_PARAMS()[parsed.botType]) {
        this.botType = parsed.botType
      }
      if (parsed.reason) this.aiReason = parsed.reason
      if (parsed.botName) this.form.botName = parsed.botName
      const base = parsed.baseConfig || {}
      if (base.symbol) this.form.symbol = base.symbol
      if (base.timeframe) this.form.timeframe = base.timeframe
      if (base.marketType) this.form.marketType = base.marketType
      if (base.leverage) this.form.leverage = Number(base.leverage) || this.form.leverage
      if (base.initialCapital) this.form.initialCapital = Number(base.initialCapital) || this.form.initialCapital
      const risk = parsed.riskConfig || {}
      if (risk.stopLossPct != null) this.form.stopLossPct = Number(risk.stopLossPct) || 0
      if (risk.takeProfitPct != null) this.form.takeProfitPct = Number(risk.takeProfitPct) || 0
      if (risk.maxPosition != null) {
        this.form.maxPosition = Number(risk.maxPosition) || 0
        this.maxPositionDirty = true
      }
      if (risk.maxDailyLoss != null) {
        this.form.maxDailyLoss = Number(risk.maxDailyLoss) || 0
        this.maxDailyLossDirty = true
      }
      if (risk.gridOobBufferPct != null) this.form.gridOobBufferPct = Number(risk.gridOobBufferPct) || 0
      const sp = parsed.strategyParams || {}
      const target = this.p[this.botType]
      if (target && sp && typeof sp === 'object') {
        Object.entries(sp).forEach(([key, val]) => {
          if (val != null && key in target) target[key] = val
        })
        if (this.botType === 'grid' && sp.amountPerGrid != null && Number(sp.amountPerGrid) > 0) {
          this.gridCapitalLinked = false
        }
        if (this.botType === 'dca' && sp.totalBudget != null && Number(sp.totalBudget) > 0) {
          this.dcaCapitalLinked = false
        }
      }
      // 触发一次联动：投入金额 → 最大持仓 / 单日最大亏损 / 每格金额
      const capital = Number(this.form.initialCapital) || 0
      if (capital > 0) {
        if (!this.maxPositionDirty && this.botType !== 'martingale') {
          this.form.maxPosition = capital
        }
        if (!this.maxDailyLossDirty) {
          this.form.maxDailyLoss = Math.round(capital * 0.1)
        }
        if (this.botType === 'grid' && this.gridCapitalLinked && this.p.grid.gridCount > 0) {
          this.p.grid.amountPerGrid = Math.floor(capital / this.p.grid.gridCount)
        }
        if (this.botType === 'dca' && this.dcaCapitalLinked) {
          this.p.dca.totalBudget = capital
          if (!this.p.dca.amountEach || this.p.dca.amountEach <= 0) {
            this.p.dca.amountEach = Math.max(1, Math.round(capital / 30))
          }
        }
      }
      // 现货市场 → 强制方向为 long
      if (this.form.marketType === 'spot') {
        this.p.grid.gridDirection = 'long'
        this.p.martingale.direction = 'long'
        this.p.trend.direction = 'long'
      }
    },
    normalizeIncomingPreset(raw) {
      const source = raw || {}
      const baseRaw = source.baseConfig || source.base_config || {}
      const tc = source.trading_config || {}
      const botType = this.normalizeBotType(
        source.botType || source.bot_type || source.strategy_bot_type || tc.bot_type || 'grid'
      )
      const paramsRaw =
        source.strategyParams ||
        source.strategy_params ||
        source.bot_params ||
        tc.bot_params ||
        source.params ||
        {}
      const riskRaw = source.riskConfig || source.risk_config || tc || {}
      return {
        botType,
        botName: source.botName || source.strategyName || source.strategy_name || '',
        reason: source.reason || source.analysis || source.ai_reason || source.summary || '',
        baseConfig: {
          symbol: baseRaw.symbol || source.symbol || tc.symbol || '',
          timeframe: baseRaw.timeframe || source.timeframe || tc.timeframe || '',
          marketType: baseRaw.marketType || baseRaw.market_type || source.marketType || source.market_type || tc.market_type || '',
          leverage: baseRaw.leverage || source.leverage || tc.leverage,
          initialCapital: baseRaw.initialCapital || baseRaw.initial_capital || source.initialCapital || source.initial_capital || tc.initial_capital
        },
        strategyParams: this.normalizeBotParams(botType, paramsRaw),
        riskConfig: this.normalizeRiskConfig(riskRaw)
      }
    },
    normalizeBotType(value) {
      const raw = String(value || '').trim().toLowerCase()
      const map = {
        grid_bot: 'grid',
        grid: 'grid',
        martingale_bot: 'martingale',
        martin: 'martingale',
        martingale: 'martingale',
        trend_bot: 'trend',
        trend: 'trend',
        trend_following: 'trend',
        dca_bot: 'dca',
        dca: 'dca'
      }
      return map[raw] || (DEFAULT_PARAMS()[raw] ? raw : 'grid')
    },
    normalizeRiskConfig(raw) {
      const src = raw || {}
      const aliases = {
        stop_loss_pct: 'stopLossPct',
        take_profit_pct: 'takeProfitPct',
        max_position: 'maxPosition',
        max_daily_loss: 'maxDailyLoss',
        grid_oob_buffer_pct: 'gridOobBufferPct'
      }
      return this.normalizeKeys(src, aliases)
    },
    normalizeBotParams(type, raw) {
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
      const normalized = this.normalizeKeys(raw || {}, aliases)
      if (normalized.waterfallDropPct != null && normalized.waterfallDropPct !== '') {
        normalized.waterfallDropPct = this.ratioOrPercentToUiPercent(normalized.waterfallDropPct)
      }
      const defaults = DEFAULT_PARAMS()[type] || {}
      const out = {}
      Object.keys(defaults).forEach((key) => {
        if (normalized[key] != null) out[key] = normalized[key]
      })
      return out
    },
    normalizeKeys(raw, aliases) {
      const out = {}
      Object.entries(raw || {}).forEach(([key, val]) => {
        const mapped = aliases[key] || key
        out[mapped] = this.normalizeValue(mapped, val)
      })
      return out
    },
    normalizeValue(key, val) {
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
        'stopLossPct', 'takeProfitPct', 'maxPosition', 'maxDailyLoss', 'gridOobBufferPct',
        'leverage', 'initialCapital'
      ]
      if (numericKeys.includes(key)) {
        const n = Number(val)
        return Number.isFinite(n) ? n : val
      }
      return val
    },
    ratioOrPercentToUiPercent(value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return value
      if (n > 0 && n <= 1) return +(n * 100).toFixed(4)
      return n
    },
    onTypeChange(val) {
      if (this.aiStrategyCode) return
      this.botType = val
    },
    openCredentialPicker() {
      if (!this.credentials.length) {
        showToast({ message: this.$t('bot_create.need_credential'), type: 'fail' })
        this.$router.push('/profile/credentials/new')
        return
      }
      this.showCredentialPicker = true
    },
    onCredentialSelect(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.[0]
      if (selected) this.form.credentialId = selected.value
      this.showCredentialPicker = false
    },
    onTfSelect(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.[0]
      if (selected) this.form.timeframe = selected.value
      this.showTfPicker = false
    },
    onFreqSelect(payload) {
      const selected = payload?.selectedOptions?.[0] || payload?.[0]
      if (selected) this.p.dca.frequency = selected.value
      this.showFreqPicker = false
    },
    resolveTradeDirection(sp) {
      if (this.form.marketType === 'spot') return 'long'
      if (this.botType === 'grid') {
        const dir = sp.gridDirection || 'neutral'
        return { neutral: 'both', long: 'long', short: 'short' }[dir] || 'both'
      }
      if (this.botType === 'martingale' || this.botType === 'trend') {
        return sp.direction || 'long'
      }
      return 'long'
    },
    buildPayload() {
      const capital = Number(this.form.initialCapital) || 0
      const sp = this.normalizeBotParams(this.botType, { ...this.p[this.botType] })
      const scriptParams = { ...sp }
      if (capital > 0) scriptParams._initialCapital = capital

      if (this.botType === 'grid') {
        if (!scriptParams.amountPerGrid || scriptParams.amountPerGrid <= 0) {
          scriptParams.amountPerGrid = capital / (scriptParams.gridCount || 10)
          sp.amountPerGrid = scriptParams.amountPerGrid
        }
      } else if (this.botType === 'martingale') {
        const firstOrder = this.martingaleFirstOrder > 0
          ? this.martingaleFirstOrder
          : Math.max(10, capital / ((Math.pow(scriptParams.multiplier || 2, scriptParams.maxLayers || 5) - 1) / ((scriptParams.multiplier || 2) - 1)))
        scriptParams.initialAmount = firstOrder
        sp.initialAmount = firstOrder
      } else if (this.botType === 'dca') {
        if (!scriptParams.totalBudget || scriptParams.totalBudget <= 0) {
          scriptParams.totalBudget = capital
          sp.totalBudget = capital
        }
      }

      const effectiveTimeframe = this.isGridOrMartingale ? '1m' : this.form.timeframe
      const generated = generateBotScript(this.botType, scriptParams, { timeframe: effectiveTimeframe })
      const code = (this.aiStrategyCode && String(this.aiStrategyCode).trim()) || generated
      const tradeDirection = this.resolveTradeDirection(sp)
      const orderMode = (this.botType === 'martingale' || this.botType === 'trend')
        ? 'market'
        : (sp.orderMode || 'maker')

      return {
        strategy_name: this.form.botName || `${this.botType.toUpperCase()} · ${this.form.symbol}`,
        strategy_type: 'ScriptStrategy',
        strategy_mode: 'bot',
        strategy_code: code,
        market_category: 'Crypto',
        execution_mode: 'live',
        exchange_config: {
          credential_id: this.form.credentialId,
          exchange_id: this.currentExchangeId
        },
        trading_config: {
          symbol: this.form.symbol,
          timeframe: effectiveTimeframe,
          market_type: this.form.marketType,
          leverage: this.form.marketType === 'spot' ? 1 : (this.form.leverage || 5),
          trade_direction: tradeDirection,
          initial_capital: capital,
          stop_loss_pct: this.botType === 'martingale' ? 0 : this.form.stopLossPct,
          take_profit_pct: this.botType === 'martingale' ? 0 : this.form.takeProfitPct,
          max_position: this.botType === 'martingale' ? 0 : this.form.maxPosition,
          max_daily_loss: this.form.maxDailyLoss || 0,
          bot_type: this.botType,
          bot_params: sp,
          ...((this.botType === 'grid' || this.botType === 'dca')
            ? { grid_oob_buffer_pct: this.form.gridOobBufferPct ?? 5 }
            : {}),
          order_mode: orderMode,
          entry_trigger_mode: 'immediate'
        },
        notification_config: { channels: ['browser'], targets: {} },
        bot_type: this.botType
      }
    },
    async submit() {
      if (!this.form.credentialId) {
        showToast({ message: this.$t('bot_create.need_credential'), type: 'fail' })
        return
      }
      if (!this.form.symbol?.trim()) {
        showToast({ message: this.$t('bot_create.need_symbol'), type: 'fail' })
        return
      }
      this.submitting = true
      try {
        const payload = this.buildPayload()
        if (this.isEditMode) {
          await strategyApi.update(this.editId, payload)
          showToast({ message: this.$t('bot_create.update_success'), type: 'success' })
        } else {
          await strategyApi.create(payload)
          showToast({ message: this.$t('bot_create.create_success'), type: 'success' })
        }
        this.$router.replace('/trading')
      } catch (err) {
        const fallback = this.isEditMode
          ? this.$t('bot_create.update_fail')
          : this.$t('bot_create.create_fail')
        showToast({ message: err?.message || fallback, type: 'fail' })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.page { min-height: 100vh; padding-bottom: 120px; }
:deep(.van-nav-bar) { background: transparent; }
:deep(.van-nav-bar .van-nav-bar__title),
:deep(.van-nav-bar .van-icon) { color: var(--text); }
.ai-banner {
  margin: 8px 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: var(--c-indigo-soft);
  border: 1px solid transparent;
  color: var(--c-indigo);
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.ai-banner.script {
  background: var(--warn-soft);
  color: var(--warn);
}
.ai-banner.edit {
  background: var(--accent-soft);
  color: var(--accent);
}

/* Wizard step indicator (sticky, mirrors PC a-steps) */
.wizard-steps {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--hairline);
  overflow-x: auto;
  scrollbar-width: none;
}
.wizard-steps::-webkit-scrollbar { display: none; }
.ws-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 70px;
  gap: 6px;
  cursor: pointer;
}
.ws-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  color: var(--text-3);
  font-size: 12px;
  font-weight: 700;
  z-index: 1;
}
.ws-item.active .ws-dot {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--text-on-accent, #fff);
}
.ws-item.done .ws-dot {
  background: var(--up);
  border-color: var(--up);
  color: #fff;
}
.ws-text {
  font-size: 11px;
  color: var(--text-3);
  font-weight: 600;
  white-space: nowrap;
}
.ws-item.active .ws-text { color: var(--text); }
.ws-item.done .ws-text { color: var(--up); }
.ws-line {
  position: absolute;
  top: 13px;
  left: calc(50% + 13px);
  width: calc(100% - 26px);
  height: 1px;
  background: var(--border);
}
.ws-line.done { background: var(--up); }

.confirm-card {
  margin: 0 16px;
  padding: 4px 14px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.confirm-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid var(--hairline);
  font-size: 13px;
}
.confirm-row:first-child { border-top: none; }
.confirm-label { color: var(--text-3); }
.confirm-value {
  color: var(--text);
  font-weight: 600;
  text-align: right;
  display: flex;
  align-items: center;
  gap: 8px;
}
.leverage-chip {
  padding: 2px 6px;
  border-radius: 6px;
  background: var(--warn-soft);
  color: var(--warn);
  font-size: 11px;
  font-weight: 700;
}
.segmented--locked {
  opacity: 0.55;
  pointer-events: none;
}
.segmented {
  margin: 8px 16px 16px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}
.seg {
  padding: 14px;
  border-radius: var(--radius);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.seg.active {
  background: var(--accent-soft);
  border-color: var(--accent);
}
.seg-title { color: var(--text); font-weight: 700; font-size: 14px; }
.seg-desc { color: var(--text-2); font-size: 11px; margin-top: 4px; line-height: 1.5; }
.section { margin: 10px 0 18px; }
.section-title {
  padding: 0 24px 8px;
  font-size: 12px;
  color: var(--text-3);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
:deep(.van-cell-group--inset) {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  margin: 0 16px;
}
:deep(.van-cell) { background: transparent; color: var(--text); }
:deep(.van-cell__title), :deep(.van-cell__value), :deep(.van-field__label) { color: var(--text-2); }
:deep(.van-field__control) { color: var(--text); }
:deep(.van-radio__label) { color: var(--text); font-size: 12px; }
.submit-wrap { padding: 20px 16px; }

.field-hint {
  padding: 4px 24px 8px;
  font-size: 11px;
  color: var(--text-3);
  line-height: 1.5;
}
.auto-tip-icon {
  color: var(--accent, #6366f1);
  font-size: 14px;
}
.grid-summary,
.strategy-summary {
  margin: 8px 16px 4px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--accent-soft, rgba(99,102,241,.08));
  border: 1px dashed var(--accent, rgba(99,102,241,.4));
}
.strategy-summary.martingale {
  background: rgba(245, 34, 45, 0.06);
  border-color: rgba(245, 34, 45, 0.3);
}
.strategy-summary.dca {
  background: rgba(82, 196, 26, 0.06);
  border-color: rgba(82, 196, 26, 0.3);
}
.summary-row {
  display: flex;
  justify-content: space-between;
  padding: 3px 0;
  font-size: 12px;
}
.summary-label { color: var(--text-2); }
.summary-value { color: var(--text); font-weight: 700; }
</style>
