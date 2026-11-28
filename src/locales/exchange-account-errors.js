const bitgetUnifiedAccount = 'quickTrade.errorHints.bitgetUnifiedAccount'

export default {
  'zh-CN': {
    'quickTrade.errorHints.sizingUnavailable': "无法根据金额和价格安全计算下单数量，本次未提交订单。请检查金额，待行情可用后重试。",
    [bitgetUnifiedAccount]: '这把 Bitget API Key 当前连接的是混合账户。资金仍在经典合约或资金账户中，而 V3 统一交易账户没有可用余额。请先在 Bitget 完成统一账户升级或把资金划入统一交易账户，然后刷新。'
  },
  'zh-TW': {
    'quickTrade.errorHints.sizingUnavailable': "無法根據金額和價格安全計算下單數量，本次未提交訂單。請檢查金額，待行情可用後重試。",
    [bitgetUnifiedAccount]: '此 Bitget API Key 目前連接的是混合帳戶。資金仍在經典合約或資金帳戶中，而 V3 統一交易帳戶沒有可用餘額。請先在 Bitget 完成統一帳戶升級或將資金轉入統一交易帳戶，然後重新整理。'
  },
  'en-US': {
    'quickTrade.errorHints.sizingUnavailable': "Unable to calculate a safe order quantity from the amount and price. No order was submitted. Check the amount and try again when quotes are available.",
    [bitgetUnifiedAccount]: 'This Bitget API key is connected to a hybrid account. Its funds remain in the Classic or Funding account, while the V3 Unified Trading Account has no available balance. Upgrade or transfer the funds to the Unified Trading Account, then refresh.'
  },
  'ja-JP': {
    'quickTrade.errorHints.sizingUnavailable': "金額と価格から安全な注文数量を計算できません。注文は送信されていません。金額を確認し、価格情報が利用可能になってから再試行してください。",
    [bitgetUnifiedAccount]: 'この Bitget API キーはハイブリッド口座に接続されています。資金は Classic または Funding 口座に残っており、V3 統一取引口座の利用可能残高はありません。統一口座へアップグレードするか資金を移動してから、更新してください。'
  },
  'ko-KR': {
    'quickTrade.errorHints.sizingUnavailable': "금액과 가격으로 안전한 주문 수량을 계산할 수 없습니다. 주문이 제출되지 않았습니다. 금액을 확인하고 시세를 이용할 수 있을 때 다시 시도하세요.",
    [bitgetUnifiedAccount]: '이 Bitget API 키는 하이브리드 계정에 연결되어 있습니다. 자금은 Classic 또는 Funding 계정에 남아 있고 V3 통합 거래 계정에는 사용 가능한 잔액이 없습니다. 통합 계정으로 업그레이드하거나 자금을 이체한 후 새로고침하세요.'
  }
}
