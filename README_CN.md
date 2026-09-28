# QuantDinger 手机端

<p align="right"><a href="README.md">English</a></p>

<p align="center">
  <a href="banner-v2.png" title="查看完整海报"><img src="banner-v2.png" alt="QuantDinger 手机端预览" width="720" /></a>
</p>

**QuantDinger Mobile** 是 **Open Byte Inc** 推出的 [QuantDinger](https://github.com/OpenByteInc/QuantDinger) **AI Trading OS** 的源码可见手机端与 H5 客户端。它把桌面平台最常用的工作流整理成适合手机操作的体验，包括策略发现、运行管理、AI 投研、行情与交易、市场购买和账户管理。

线上手机站：[m.quantdinger.com](https://m.quantdinger.com)

手机端主要服务于随身查看和轻量操作：查看行情与 AI 分析、管理策略和交易机器人、进行闪电交易、调整账户设置、维护交易所 API 等。它不是另一套独立系统，而是同一套后端之上的移动界面。

同一套 Vue 3 代码可以发布为：

- Docker 或静态站点托管的 H5 应用
- 通过 Capacitor 打包的 Android 应用
- 在 macOS + Xcode 环境下打包的 iOS 应用

## 当前产品功能

目前底部导航围绕五个日常工作流组织：

| 页面 | 主要用途 |
|------|----------|
| 首页 | 按偏好发现经过数据验证的策略，对比收益、回撤、夏普率和盈亏比，并查看个人自选行情。 |
| 运行 | 启动和管理实盘或仅信号策略，检查持仓、订单、成交、盈亏和运行健康。 |
| AI 投研 | 选择标的后生成带证据的专业报告，或执行趋势诊断、新闻影响、机会与风险分析。 |
| 指标 | 查看多市场行情、K 线和信号，切换标的与交易场所，并通过已连接账户确认后下单。 |
| 我的 | 管理交易所和券商凭证、已购内容、积分与会员、通知、账户安全、多语言、明暗模式和主题色。 |

界面完整支持简体中文、繁体中文、英文、日文和韩文，并针对真机窄屏、安全区域和桌面浏览器预览做了响应式适配。

五个主入口还连接以下完整流程：

- **策略与指标市场：**支持搜索、筛选、排序和分页；展示业绩与价格；区分源码可见和源码保护；支持积分购买、查看已购内容和兼容性检查。
- **运行策略：**从已保存或已购买的策略开始，选择兼容账户，切换实盘或仅信号模式，配置参数与通知渠道，并在提交前确认实盘风险。
- **运行管理：**查看健康状态、延迟、待处理订单、净值、盈亏、持仓、交易所挂单、成交、AI 复盘和策略日志，并按当前状态启动、停止、编辑或删除。
- **图表交易：**支持加密货币现货与永续的市价/限价单、按币种数量卖出现货、永续杠杆与保证金模式、可选止盈止损、持仓和订单记录；所有实盘订单提交前都要求确认。受支持的美股账户使用独立的股数下单流程。
- **AI 投研：**支持带标的上下文的对话、专业报告、趋势诊断、新闻影响、机会与风险、图表附件、对话历史和记忆。
- **账户与安全：**支持邮箱密码和已启用的第三方登录、MFA、登录记录、资料编辑、邀请、交易账户、通知渠道、积分、会员及后端已配置的支付方式。

部分能力只有在后端启用对应登录服务、交易场所、支付方式或通知渠道后才会显示。

## 推荐部署方式

大多数用户建议直接跟随主仓库部署整套 QuantDinger。主仓库 Compose 会自动拉取手机端镜像，并把 `/api/` 转发到后端，不需要手动配置前后端连接。

Linux 或 macOS：

```bash
curl -fsSL https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/install.sh | bash
```

Windows PowerShell：

```powershell
irm https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/install.ps1 | iex
```

完整部署后的默认地址：

| 客户端 | 地址 |
|--------|------|
| 桌面端 Web | `http://localhost:8888` |
| 手机端 H5 | `http://localhost:8889` |
| 后端 API | 由前端容器通过 `/api/` 自动反向代理 |

如果用手机访问同一局域网内的电脑，请把 `localhost` 换成电脑的局域网 IP，例如：

```text
http://192.168.1.10:8889
```

## GHCR 镜像

手机端镜像地址：

```text
ghcr.io/openbyteinc/quantdinger-mobile
```

常用标签包括 `latest`、具体语义化版本，以及 `4.0` 这样的主次版本标签。在主仓库 `.env` 中可以用 `IMAGE_TAG` 固定整套系统版本，也可以用 `MOBILE_TAG` 单独固定手机端版本。

如果后端已经部署好，也可以单独运行手机端镜像：

```bash
docker run -d --name quantdinger-mobile \
  -p 8889:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/openbyteinc/quantdinger-mobile:latest
```

`BACKEND_URL` 控制容器内 Nginx 的 `/api/` 反向代理目标。主仓库 Compose 里通常保持为 `http://backend:5000`。

## 本地开发

### 环境要求

| 工具 | 版本 |
|------|------|
| Node.js | Node 20.19+ 或 22.12+。推荐直接使用 Node 22 LTS。 |
| pnpm | pnpm 11，与 `packageManager` 声明一致；推荐通过 Corepack 使用。 |
| 后端 | 默认要求 QuantDinger API 可通过 `http://localhost:5000` 访问。 |
| 原生构建 | Android 需要 Android Studio；iOS 需要 macOS 和 Xcode。 |

### 启动 H5 开发服务

```bash
git clone https://github.com/OpenByteInc/QuantDinger-Mobile.git
cd QuantDinger-Mobile
corepack enable
pnpm install
pnpm dev
```

浏览器打开：

```text
http://localhost:5173
```

Vite 会把 `/api/*` 默认转发到：

```text
http://localhost:5000
```

如果后端不在这个地址，启动前设置：

```bash
VITE_DEV_API_TARGET=http://127.0.0.1:5000 pnpm dev
```

开发者工具里看到 `http://localhost:5173/api/...` 是正常现象：浏览器先请求 Vite，Vite 再把请求转发到真正的后端。

## API 地址应该怎么配

手机端和 H5 优先推荐使用同源 `/api/` 反向代理。这样最少遇到跨域问题，也和 Docker 部署方式一致。

| 运行方式 | 推荐做法 |
|----------|----------|
| 主仓库 Docker 部署 | 通常不用改。手机端在 `MOBILE_PORT` 提供 H5，`/api/` 自动转发到后端。 |
| 单独运行手机端 Docker 镜像 | 如果后端不是同网络里的 `http://backend:5000`，启动容器时传入 `BACKEND_URL`。 |
| `pnpm dev` 本地开发 | 如果后端不在 `http://localhost:5000`，设置 `VITE_DEV_API_TARGET`。 |
| 自己部署静态 H5 | 发布 `dist/`，并在 Web 服务器上把 `/api/` 反代到 QuantDinger 后端。 |
| 仓库内的 Android 远端 H5 壳 | 加载 `https://m.quantdinger.com`，通常通过该站点的同源 `/api/` 反向代理访问后端。 |
| 自建远端 H5 壳 | 把 Capacitor `server.url` 指向自己的 HTTPS 手机站，并在该站点反代 `/api/`。 |
| 内置 Web 资源的原生包 | 构建时设置 `VITE_DEFAULT_SERVER_URL=https://api.example.com`，并保证手机可以访问。 |

`VITE_DEFAULT_SERVER_URL` 属于 Vite 构建产物。仓库内的 Android 工程加载 `capacitor.config.json` 指定的远端手机站，因此普通 Vue 页面和 API 行为可通过部署手机站更新，无需重打 APK。如果你要分发内置 Web 资源的安装包，或把壳指向自己的站点，请在构建环境或本机 `.env.local` 中设置地址，不要把私有地址提交到仓库。

例如在本机创建或修改 `.env.local`：

```env
VITE_DEFAULT_SERVER_URL=https://api.example.com
VITE_PUBLIC_WEB_BASE_URL=https://m.example.com
```

注意：

- 仓库不提供硬编码的 `.env.production`，因此预构建 H5 和 Docker 镜像默认走同源 `/api/`，不会绕过 `BACKEND_URL`。
- `VITE_DEFAULT_SERVER_URL` 必须是手机能访问到的地址，不能只在你的电脑上能访问。
- 公网部署建议使用 HTTPS。部分 Android 设备或网络环境会限制不安全的 HTTP 请求。
- APK 里不要填 `localhost` 或 `127.0.0.1`，手机上的 `localhost` 指的是手机自己，不是你的电脑或服务器。
- 局域网测试可以填电脑的局域网 IP，例如 `http://192.168.1.10:5000`。
- 地址末尾有没有 `/` 都可以，应用会自动去掉末尾斜杠。

## Google 与 GitHub 第三方登录

H5 与原生壳共用后端 OAuth 接口，但原生壳会在系统浏览器中打开登录服务。部署时要同时配置完整链路：

```env
FRONTEND_URL=https://app.example.com,https://m.example.com
OAUTH_ALLOWED_REDIRECTS=com.quantdinger.mobile://login
GOOGLE_REDIRECT_URI=https://api.example.com/api/auth/oauth/google/callback
GITHUB_REDIRECT_URI=https://api.example.com/api/auth/oauth/github/callback
```

- 在 Google Cloud Console 中逐字注册 `GOOGLE_REDIRECT_URI`。Google 的回调地址属于后端 API，不是手机端首页。
- 把手机站 HTTPS 域名加入 `FRONTEND_URL`，这样 `/api/auth/oauth/google` 才能保留正确的前端目标。
- 把 `com.quantdinger.mobile://login` 加入 `OAUTH_ALLOWED_REDIRECTS`，完成登录后才能回到已安装的 App。
- 未设置 `VITE_DEFAULT_SERVER_URL` 时，原生远端 H5 壳现在会先把当前 `https://m.example.com` 补成完整 OAuth 地址，再调用 Capacitor Browser。原生浏览器插件不能直接打开相对路径 `/api/...`。
- Android 已声明对应的 `com.quantdinger.mobile://login` intent filter。修改原生清单或插件后仍需重新打包。

## 构建

### H5 构建

```bash
pnpm build
pnpm preview
```

生产产物会输出到 `dist/`。

如果自行托管静态 H5，请确认：

- SPA 路由回退到 `index.html`
- `/api/` 已反向代理到 QuantDinger 后端
- 公网环境启用了 HTTPS
- 如果启用 OAuth，后端允许当前 H5 域名作为回跳地址

### 原生 App 固定远端 H5

仓库中已提交的 Android 壳，以及使用同一份 Capacitor 配置生成的 iOS 壳，会加载线上手机站：

```json
{
  "server": {
    "url": "https://m.quantdinger.com"
  }
}
```

这种模式下，Vue 页面、路由、文案、主题、接口调用等 Web 层改动，只要发布 `m.quantdinger.com` 就能让 App 用户看到更新，不需要重新下载安装 APK。只有涉及 Capacitor 插件、权限、图标、启动图、包名、系统级配置或应用商店要求时，才需要重新打 APK/IPA。

### Android

如果你要打包给自己的服务器使用，先在 `.env.production` 里写好默认后端地址：

```env
VITE_DEFAULT_SERVER_URL=https://api.example.com
VITE_PUBLIC_WEB_BASE_URL=https://m.example.com
```

然后再打包：

```bash
corepack enable
pnpm install
pnpm cap:assets
pnpm build:android
cd android
./gradlew assembleDebug
```

Windows PowerShell 示例：

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
pnpm.cmd cap:assets
pnpm.cmd build:android
cd android
.\gradlew.bat assembleDebug
```

也可以在 PowerShell 里临时指定一次，不改 `.env.production`：

```powershell
$env:VITE_DEFAULT_SERVER_URL = "https://api.example.com"
$env:VITE_PUBLIC_WEB_BASE_URL = "https://m.example.com"
pnpm.cmd build
pnpm.cmd exec cap sync android
cd android
.\gradlew.bat assembleDebug
```

Debug APK 输出位置：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

发布版签名文件不会提交到仓库。请把 keystore 和签名配置保存在本机安全位置或 CI secrets 中。

### iOS

iOS 构建需要 macOS 和 Xcode。生成的 `ios/` 工程不会提交到仓库，首次构建前需要创建一次：

```bash
pnpm install
pnpm exec cap add ios
pnpm cap:assets
pnpm build:ios
pnpm cap:ios
```

在 iOS 真机测试第三方登录前，还要在生成的 Xcode 工程 `CFBundleURLTypes` 中注册 `com.quantdinger.mobile://login`。

## 验证

```bash
pnpm test:unit
pnpm build
```

单元测试覆盖多语言完整性、交易请求与安全校验、策略排序、市场功能边界、主题配置、AI 报告处理和原生 OAuth 地址生成。

## 目录结构

```text
QuantDinger-Mobile/
├── src/
│   ├── api/                # 请求封装和接口模块
│   ├── assets/             # 图片和静态资源
│   ├── components/         # 手机端通用组件
│   ├── config/             # 默认服务地址、H5 地址、主题等
│   ├── router/             # Vue Router 4
│   ├── stores/             # Pinia 状态
│   ├── styles/             # 全局样式
│   ├── utils/              # 工具函数
│   └── views/              # 页面模块
├── android/                # Capacitor Android 工程
├── public/                 # Web Manifest 和公开静态资源
├── resources/              # 原生图标与启动图源文件
├── tests/                  # 单元与浏览器回归检查
├── deploy/                 # Docker 镜像使用的 Nginx 模板
├── .github/workflows/      # 版本化 GHCR 镜像与静态包发布流程
├── capacitor.config.json
├── vite.config.js
├── package.json
└── LICENSE
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3 |
| 构建 | Vite 7 |
| 原生壳 | Capacitor 6 |
| 移动端 UI | Vant 4 |
| 状态管理 | Pinia |
| 路由 | Vue Router 4 |
| 多语言 | vue-i18n |
| 请求 | Axios |

## 常见问题

| 现象 | 排查方向 |
|------|----------|
| Vite 提示需要 Node 20.19+ 或 22.12+ | 切换到 Node 22 LTS。 |
| H5 刷新页面后 404 | Web 服务器没有配置 SPA 回退到 `index.html`。 |
| H5 接口跨域或请求失败 | 优先使用同源 `/api/` 反向代理；或者在后端显式放行当前 H5 域名。 |
| 手机访问不到本地后端 | 用电脑的局域网 IP，不要用 `localhost`。手机上的 `localhost` 指手机自己。 |
| Docker 容器启动了但接口不通 | 检查 `BACKEND_URL`，以及容器内部是否能访问这个地址。 |
| 只有已安装的 App 点击第三方登录后立即失败 | 确认部署的前端已经包含原生 OAuth 完整地址修复，并检查手机站同源 `/api/` 反向代理是否可访问。Capacitor Browser 不能打开相对路径 `/api/...`。 |
| OAuth 能打开服务商，但完成后回错页面 | 更新后端 `FRONTEND_URL` 和 `OAUTH_ALLOWED_REDIRECTS`，然后重启或重新部署后端。 |

## 相关仓库

| 仓库 | 作用 |
|------|------|
| [QuantDinger](https://github.com/OpenByteInc/QuantDinger) | 后端 API、Docker Compose、数据库服务和部署文档 |
| [QuantDinger-Vue](https://github.com/OpenByteInc/QuantDinger-Vue) | 桌面端 Web 前端 |
| **QuantDinger-Mobile** | 本仓库：手机端和 H5 前端 |

## 许可协议

本仓库使用 **QuantDinger Frontend Source-Available License v1.0**，完整条款见 [`LICENSE`](./LICENSE)。

简单说：符合条款的非商业用途和合格非营利用途可以免费使用；商业用途需要取得 **Open Byte Inc** 的书面授权。请保留版权声明、许可文件和应用内要求保留的 QuantDinger 品牌署名。

## 联系方式

- 官网：[quantdinger.com](https://quantdinger.com)
- Telegram：[t.me/worldinbroker](https://t.me/worldinbroker)
- 邮箱：[support@quantdinger.com](mailto:support@quantdinger.com)
