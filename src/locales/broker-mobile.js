const rows = {
  unsupported: ['暂不支持该券商', '暫不支援該券商', 'This broker is not supported', 'このブローカーには対応していません', '이 브로커는 지원되지 않습니다'],
  stockMarket: ['股票', '股票', 'Stocks', '株式', '주식'],
  usStocks: ['美股', '美股', 'US stocks', '米国株', '미국 주식'],
  hkStocks: ['港股', '港股', 'Hong Kong stocks', '香港株', '홍콩 주식'],
  connected: ['已连接', '已連線', 'Connected', '接続済み', '연결됨'],
  disconnected: ['连接异常', '連線異常', 'Connection issue', '接続エラー', '연결 오류'],
  connectAndSave: ['连接并保存', '連線並儲存', 'Connect and save', '接続して保存', '연결 및 저장'],
  connectSuccess: ['券商账户已连接', '券商帳戶已連線', 'Broker account connected', 'ブローカー口座に接続しました', '브로커 계좌가 연결되었습니다'],
  tigerId: ['Tiger ID', 'Tiger ID', 'Tiger ID', 'Tiger ID', 'Tiger ID'],
  tigerIdHint: ['请输入 Tiger OpenAPI ID', '請輸入 Tiger OpenAPI ID', 'Enter the Tiger OpenAPI ID', 'Tiger OpenAPI ID を入力', 'Tiger OpenAPI ID를 입력하세요'],
  accountId: ['券商账户 ID', '券商帳戶 ID', 'Broker account ID', 'ブローカー口座 ID', '브로커 계좌 ID'],
  accountIdHint: ['请输入授权账户 ID', '請輸入授權帳戶 ID', 'Enter the authorized account ID', '認証済み口座 ID を入力', '승인된 계좌 ID를 입력하세요'],
  accountIdOptional: ['券商账户 ID（可选）', '券商帳戶 ID（選填）', 'Broker account ID (optional)', 'ブローカー口座 ID（任意）', '브로커 계좌 ID (선택)'],
  privateKey: ['OpenAPI 私钥', 'OpenAPI 私鑰', 'OpenAPI private key', 'OpenAPI 秘密鍵', 'OpenAPI 개인 키'],
  privateKeyHint: ['粘贴完整 PEM 私钥', '貼上完整 PEM 私鑰', 'Paste the complete PEM private key', '完全な PEM 秘密鍵を貼り付け', '전체 PEM 개인 키를 붙여넣으세요'],
  licenseOptional: ['OpenAPI License（可选）', 'OpenAPI License（選填）', 'OpenAPI license (optional)', 'OpenAPI License（任意）', 'OpenAPI 라이선스 (선택)'],
  appKey: ['App Key', 'App Key', 'App Key', 'App Key', 'App Key'],
  appSecret: ['App Secret', 'App Secret', 'App Secret', 'App Secret', 'App Secret'],
  accessTokenOptional: ['Access Token（可选）', 'Access Token（選填）', 'Access token (optional)', 'Access Token（任意）', 'Access Token (선택)'],
  paper: ['模拟账户', '模擬帳戶', 'Paper account', 'ペーパー口座', '모의 계좌'],
  sandbox: ['沙盒环境', '沙盒環境', 'Sandbox', 'サンドボックス', '샌드박스'],
  live: ['实盘环境', '實盤環境', 'Live', 'ライブ', '실거래'],
  credentialsRequired: ['请完整填写券商凭证', '請完整填寫券商憑證', 'Complete the broker credentials', 'ブローカー認証情報を入力してください', '브로커 인증 정보를 모두 입력하세요'],
  invalidPrivateKey: ['私钥必须是完整的 PEM 格式', '私鑰必須是完整的 PEM 格式', 'The private key must use complete PEM format', '秘密鍵は完全な PEM 形式で入力してください', '개인 키는 전체 PEM 형식이어야 합니다'],
  accountOverview: ['券商账户概览', '券商帳戶概覽', 'Broker account overview', 'ブローカー口座概要', '브로커 계좌 개요'],
  stockOrder: ['股票委托', '股票委託', 'Stock order', '株式注文', '주식 주문'],
  quantity: ['股数', '股數', 'Quantity', '数量', '수량'],
  orderPlaced: ['订单已提交', '訂單已提交', 'Order submitted', '注文を送信しました', '주문이 제출되었습니다'],
  noStockAccount: ['请先连接支持该市场的股票账户', '請先連線支援該市場的股票帳戶', 'Connect a stock account that supports this market', 'この市場に対応する株式口座を接続してください', '이 시장을 지원하는 주식 계좌를 연결하세요'],
  researchBrief: ['跨资产研究摘要', '跨資產研究摘要', 'Cross-asset research brief', 'クロスアセット調査概要', '크로스 자산 리서치 요약'],
  coreThesis: ['核心论点', '核心論點', 'Core thesis', 'コアシナリオ', '핵심 논지'],
  variantView: ['差异化观点', '差異化觀點', 'Variant view', '異なる見方', '차별화 관점'],
  monitoringChecklist: ['后续观察清单', '後續觀察清單', 'Monitoring checklist', 'モニタリング項目', '모니터링 체크리스트'],
  researchIntelligence: ['研究覆盖情况', '研究涵蓋情況', 'Research coverage', '調査カバレッジ', '리서치 범위'],
  workflow: ['研究工作流', '研究工作流', 'Research workflow', '調査ワークフロー', '리서치 워크플로'],
  readiness: ['结论就绪度', '結論就緒度', 'Decision readiness', '判断準備度', '의사결정 준비도']
}

const locales = ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']
const accountErrors = {
  'brokerAccounts.accountLoadFailed': ['账户信息加载失败', '帳戶資訊載入失敗', 'Unable to load the broker account', '口座情報を読み込めません', '브로커 계좌를 불러올 수 없습니다'],
  'brokerAccounts.accountSelectionRequired': ['请选择券商账户', '請選擇券商帳戶', 'Select a broker account', 'ブローカー口座を選択してください', '브로커 계좌를 선택하세요'],
  'brokerAccounts.accountUnavailable': ['券商账户暂不可用', '券商帳戶暫時無法使用', 'The broker account is unavailable', 'ブローカー口座を利用できません', '브로커 계좌를 사용할 수 없습니다'],
  'brokerAccounts.brokerAccountRequired': ['请填写券商账户 ID', '請填寫券商帳戶 ID', 'Enter the broker account ID', 'ブローカー口座 ID を入力してください', '브로커 계좌 ID를 입력하세요'],
  'brokerAccounts.brokerAccountUnavailable': ['授权账户不可用', '授權帳戶無法使用', 'The authorized account is unavailable', '認証済み口座を利用できません', '승인된 계좌를 사용할 수 없습니다'],
  'brokerAccounts.cancelRequested': ['撤单请求已提交', '撤單請求已送出', 'Cancellation requested', '取消リクエストを送信しました', '취소 요청을 보냈습니다'],
  'brokerAccounts.connectFailed': ['券商连接失败', '券商連線失敗', 'Unable to connect to the broker', 'ブローカーに接続できません', '브로커에 연결할 수 없습니다'],
  'brokerAccounts.connectSuccess': ['券商账户已连接', '券商帳戶已連線', 'Broker account connected', 'ブローカー口座に接続しました', '브로커 계좌가 연결되었습니다'],
  'brokerAccounts.credentialsRequired': ['券商凭证不完整', '券商憑證不完整', 'Broker credentials are incomplete', 'ブローカー認証情報が不足しています', '브로커 인증 정보가 불완전합니다'],
  'brokerAccounts.disconnectSuccess': ['券商连接已断开', '券商連線已中斷', 'Broker disconnected', 'ブローカー接続を解除しました', '브로커 연결이 해제되었습니다'],
  'brokerAccounts.invalidLimitPrice': ['限价必须大于零', '限價必須大於零', 'The limit price must be greater than zero', '指値は 0 より大きくしてください', '지정가는 0보다 커야 합니다'],
  'brokerAccounts.invalidOrder': ['订单参数无效', '訂單參數無效', 'The order details are invalid', '注文内容が無効です', '주문 정보가 올바르지 않습니다'],
  'brokerAccounts.noAuthorizedAccounts': ['没有可用的授权账户', '沒有可用的授權帳戶', 'No authorized broker account is available', '利用可能な認証済み口座がありません', '사용 가능한 승인 계좌가 없습니다'],
  'brokerAccounts.notConnected': ['券商尚未连接', '券商尚未連線', 'The broker is not connected', 'ブローカーに接続されていません', '브로커가 연결되지 않았습니다'],
  'brokerAccounts.orderFailed': ['订单提交失败', '訂單送出失敗', 'Unable to submit the order', '注文を送信できません', '주문을 제출할 수 없습니다'],
  'brokerAccounts.orderPlaced': ['订单已提交', '訂單已送出', 'Order submitted', '注文を送信しました', '주문이 제출되었습니다'],
  'brokerAccounts.ordersLoadFailed': ['订单加载失败', '訂單載入失敗', 'Unable to load broker orders', '注文を読み込めません', '브로커 주문을 불러올 수 없습니다'],
  'brokerAccounts.orderUnavailable': ['当前券商暂不支持此订单', '目前券商暫不支援此訂單', 'This order is unavailable for the broker', 'この注文はブローカーで利用できません', '이 주문은 브로커에서 사용할 수 없습니다'],
  'brokerAccounts.snapshotConnectionFailed': ['券商连接状态获取失败', '券商連線狀態取得失敗', 'Unable to read the broker connection status', 'ブローカー接続状態を取得できません', '브로커 연결 상태를 확인할 수 없습니다'],
  'brokerAccounts.snapshotOrdersFailed': ['账户订单同步失败', '帳戶訂單同步失敗', 'Unable to synchronize broker orders', '口座注文を同期できません', '브로커 주문을 동기화할 수 없습니다'],
  'brokerAccounts.snapshotPositionsFailed': ['账户持仓同步失败', '帳戶持倉同步失敗', 'Unable to synchronize broker positions', '口座ポジションを同期できません', '브로커 포지션을 동기화할 수 없습니다'],
  'brokerAccounts.tradingVenueDisabled': ['该券商交易通道未启用', '該券商交易通道未啟用', 'This broker trading venue is disabled', 'このブローカー取引経路は無効です', '이 브로커 거래 채널은 비활성화되어 있습니다'],
  'brokerAccounts.unsupportedBroker': ['暂不支持该券商', '暫不支援該券商', 'This broker is not supported', 'このブローカーには対応していません', '이 브로커는 지원되지 않습니다'],
  'brokerAccounts.unsupportedOrderType': ['暂不支持该订单类型', '暫不支援該訂單類型', 'This order type is not supported', 'この注文タイプには対応していません', '이 주문 유형은 지원되지 않습니다'],
  'brokerAccounts.tiger.invalidEnvironment': ['Tiger 环境参数无效', 'Tiger 環境參數無效', 'The Tiger environment is invalid', 'Tiger の環境設定が無効です', 'Tiger 환경 설정이 올바르지 않습니다'],
  'brokerAccounts.tiger.invalidPrivateKey': ['Tiger 私钥格式无效', 'Tiger 私鑰格式無效', 'The Tiger private key is invalid', 'Tiger 秘密鍵が無効です', 'Tiger 개인 키가 올바르지 않습니다'],
  'brokerAccounts.tiger.sdkUnavailable': ['Tiger OpenAPI 服务不可用', 'Tiger OpenAPI 服務無法使用', 'Tiger OpenAPI is unavailable', 'Tiger OpenAPI を利用できません', 'Tiger OpenAPI를 사용할 수 없습니다'],
  'brokerAccounts.webull.invalidEnvironment': ['Webull 环境参数无效', 'Webull 環境參數無效', 'The Webull environment is invalid', 'Webull の環境設定が無効です', 'Webull 환경 설정이 올바르지 않습니다'],
  'brokerAccounts.webull.usStocksOnly': ['Webull 当前仅支持美股', 'Webull 目前僅支援美股', 'Webull currently supports US stocks only', 'Webull は現在米国株のみ対応しています', 'Webull은 현재 미국 주식만 지원합니다']
}

export const brokerAccountMessages = Object.fromEntries(locales.map((locale, index) => [
  locale,
  Object.fromEntries(Object.entries(accountErrors).map(([key, values]) => [key, values[index]]))
]))

export default Object.fromEntries(locales.map((locale, index) => [
  locale,
  Object.fromEntries(Object.entries(rows).map(([key, values]) => [key, values[index]]))
]))
