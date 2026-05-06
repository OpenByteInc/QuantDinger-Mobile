# QuantDinger 移动端

<p align="right"><a href="README.md">English</a></p>

## 页面展示

<p align="center">
  <a href="banner.png" title="查看原图"><img src="banner.png" alt="QuantDinger 移动端 — 宣传海报与界面展示" width="720" /></a>
</p>

<p align="center"><sub><strong>海报：</strong> QuantDinger 移动端品牌与应用界面亮点；点击图片可在仓库中查看完整 <code>banner.png</code>。</sub></p>

---

**QuantDinger Mobile** 是 [QuantDinger](https://github.com/brokermr810/QuantDinger) 量化平台的官方**移动端与轻量 Web 客户端**。项目基于 **Vue 3**、**Vite** 与 **Capacitor 6**：同一套前端既可封装为 **Android / iOS** 原生壳，也可将构建产物 **`dist/`** 单独部署为 **H5**。只需在应用内配置可访问的 **API 根地址**，即可对接**自托管**后端或**官方托管**环境。

本仓库许可条款与桌面端 [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) **一致**，均采用 **Source-Available** 授权（详见根目录 [`LICENSE`](LICENSE)）。使用、分发或商用前请务必完整阅读许可正文。

---

## 目录

- [页面展示](#页面展示)
- [定位与边界](#定位与边界)
- [能力概览](#能力概览)
- [与后端的协作方式](#与后端的协作方式)
- [仓库结构](#仓库结构)
- [技术栈](#技术栈)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [npm 脚本说明](#npm-脚本说明)
- [配置 API 根地址](#配置-api-根地址)
- [Android 与 iOS 构建](#android-与-ios-构建)
- [H5 部署要点](#h5-部署要点)
- [OAuth 与后端环境变量](#oauth-与后端环境变量)
- [常见问题](#常见问题)
- [相关仓库](#相关仓库)
- [许可协议](#许可协议)
- [联系方式](#联系方式)

---

## 定位与边界

QuantDinger 的**主力操作界面**是功能完整的**桌面 Web**。本仓库面向**手机与窄屏场景**：在相同后端之上，提供触控优化、适合随身查看与轻量操作的界面（行情、策略、通知、设置、AI 分析等，以后端实际开放能力为准）。你仍使用同一套账户与策略数据，只是换了一种客户端形态。

---

## 能力概览

- 在应用内切换 **API 根地址**，便于连接开发机、局域网 Docker、公网反代或 SaaS。
- 通过 **设置 → 测试连接** 调用 `{根地址}/api/health` 做连通性自检。
- 使用 Capacitor 输出 **Android / iOS** 工程，走各应用商店或内部分发流程。
- 将 **`dist/`** 作为静态站点发布，获得与原生壳**同源**的 **H5** 体验（需正确配置 SPA 回退与 API 反代）。

具体页面与接口以后端版本为准；建议以「当前后端 + 当前移动端 commit」联调结果为准。

---

## 与后端的协作方式

应用在本地持久化保存用户输入的 **服务器根地址**（仅 **Origin**：协议 + 主机 + 端口，**不要**末尾 `/`）。所有请求在该 Origin 下访问 `/api/...` 等路径。

仓库内默认示例见 `src/config/index.js` 中的 `DEFAULT_SERVER_URL`；用户可在 **设置 → 服务器** 覆盖，覆盖值优先生效。

---

## 仓库结构

```
quantdinger-mobile/
├── src/
│   ├── api/           # 请求封装与接口模块
│   ├── assets/
│   ├── components/    # 通用组件
│   ├── config/        # 默认 API 地址、对外分享用的 H5 根地址、主题等
│   ├── router/
│   ├── stores/        # Pinia
│   ├── styles/
│   ├── utils/
│   ├── views/         # 业务页面
│   ├── App.vue
│   └── main.js
├── android/           # Capacitor Android 工程（随 sync 更新）
├── ios/               # Capacitor iOS 工程（macOS）
├── capacitor.config.json
├── vite.config.js
├── package.json
├── LICENSE
├── README.md          # 英文说明（仓库默认展示）
└── README_CN.md       # 本文件（简体中文）
```

---

## 技术栈

| 层次 | 选型 |
|------|------|
| 界面框架 | Vue 3 |
| 构建 | Vite |
| 原生容器 | Capacitor 6 |
| 移动端 UI | Vant 4 |
| 状态 | Pinia |
| 路由 | Vue Router 4（history 模式） |
| 国际化 | vue-i18n |
| HTTP | Axios |

---

## 环境要求

- **Node.js** 18 及以上（推荐 20 / 22 LTS）。
- **npm**（或兼容的包管理器）。
- 打包或调试 **Android** 需安装 **Android Studio** 与对应 SDK。
- **iOS** 需在 **macOS** 上使用 **Xcode**，并具备 Apple 开发者侧账号与签名能力。

---

## 快速开始

```bash
git clone https://github.com/brokermr810/QuantDinger-Mobile.git
cd QuantDinger-Mobile
npm install
npm run dev
```

`npm run dev` 即本地 **H5** 调试。若需原生工程，在首次构建后添加或同步平台：

```bash
npx cap add android    # 若尚未生成 android 目录
npx cap add ios        # 仅在 macOS 上执行
npm run build
npx cap sync
```

---

## npm 脚本说明

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器（H5）。 |
| `npm run build` | 生产构建，输出到 `dist/`。 |
| `npm run preview` | 本地预览构建结果。 |
| `npm run cap:sync` | 将 Web 资源同步到原生工程。 |
| `npm run cap:android` | 用 Android Studio 打开工程。 |
| `npm run cap:ios` | 用 Xcode 打开工程（macOS）。 |
| `npm run build:android` | 构建并同步 Android。 |
| `npm run build:ios` | 构建并同步 iOS。 |
| `npm run build:all` | 构建并同步已配置的全部平台。 |

---

## 配置 API 根地址

在 **设置** 中填写后端 **可被当前环境访问的 Origin**，**不要**带路径后缀。典型示例：

| 场景 | 示例 |
|------|------|
| 反代：同一域名下静态站 + `/api` 转发后端 | `https://m.example.com` |
| 局域网访问 Docker 暴露的 Web 端口 | `http://192.168.1.10:8888` |
| 仅暴露后端 API（须在服务端放行 CORS） | `http://192.168.1.10:5000` |

修改后务必使用 **测试连接**；若失败，依次检查网络、TLS、防火墙、后端监听地址及端口映射。

---

## Android 与 iOS 构建

1. 执行 `npm run build:android` 或 `npm run build:ios`。  
2. 使用 `npm run cap:android` / `cap:ios` 打开对应 IDE。  
3. 在 IDE 与各应用商店控制台中完成**包名 / Bundle ID**、签名、图标、隐私声明与上架物料。

推送通知、生物识别等能力依赖额外插件与原生配置，请参阅 Capacitor 官方文档按需启用。

---

## H5 部署要点

1. 执行 `npm run build`，将 **`dist/` 内全部文件**上传到静态站点根目录。  
2. 本项目使用 Vue Router 的 **history** 模式，服务器必须对「无前缀文件路径」回退到 **`index.html`**，否则子路径刷新或直接打开会 **404**。  
3. 强烈建议将 **`/api/`** 反向代理到 QuantDinger 后端，与前端**同源**，避免浏览器跨域限制。

下面是一段**精简的 Nginx 思路示例**（域名、证书、`root`、上游地址请按实际修改）：

```nginx
server {
    listen 443 ssl http2;
    server_name m.example.com;
    root /var/www/m.example.com;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }

    location ~* \.(?:js|css|woff2?|ttf|svg|png|jpg|jpeg|gif|ico|webp|map)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

自检示例：

```bash
curl -sI https://m.example.com/           # 期望 200，HTML
curl -sI https://m.example.com/login      # 期望 200（SPA 回退生效）
curl -sI https://m.example.com/api/health # 期望经反代访问到后端
```

---

## OAuth 与后端环境变量

在 **H5 域名**上使用 Google / GitHub 等 OAuth 时，后端必须把你的站点加入允许的回跳列表。可在 `backend_api_python/.env` 中配置类似项（示例）：

```bash
FRONTEND_URL=https://m.example.com/login
OAUTH_ALLOWED_REDIRECTS=https://m.example.com,https://m.example.com/login,https://ai.quantdinger.com,http://localhost:5173
```

修改后请**重启**或**重新构建**后端容器，并确认线上跑的是包含新配置的镜像。

---

## 常见问题

| 现象 | 排查方向 |
|------|----------|
| 访问 `/login` 或刷新后 404 | 静态服务器未配置 SPA 回退 `try_files`。 |
| 接口报 CORS 或网络错误 | 优先改为同源 `/api/` 反代；或在后端显式放行 H5 Origin。 |
| OAuth 跳错站点或参数丢失 | 后端 `OAUTH_ALLOWED_REDIRECTS`、`FRONTEND_URL` 是否与当前域名一致；镜像是否已更新。 |
| HTTPS 握手失败 | 证书链、Nginx TLS 版本（建议 TLS 1.2+）、配置语法 `nginx -t`。 |

---

## 相关仓库

| 仓库 | 说明 |
|------|------|
| [QuantDinger](https://github.com/brokermr810/QuantDinger) | 后端、Docker Compose、文档、预构建桌面 Web |
| [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) | 桌面 Web 源码（与本移动端**同一许可家族**） |
| **QuantDinger-Mobile** | 本仓库：移动端 + H5 |

---

## 许可协议

本软件适用 **QuantDinger Frontend Source-Available License v1.0**（全文见 [`LICENSE`](LICENSE)），与 [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) **同一份法律文本**。

- **非商业用途**及**符合资格的非营利 / 教育等用途**，在遵守条款的前提下**免费**使用。  
- **商业用途**须另行取得版权方的**书面商业授权**。  
- 须按许可第 3.1 条**保留**版权声明、许可证全文及应用中的 **QuantDinger** 相关署名或品牌展示，未经许可不得删除或恶意篡改。

项目级商标与品牌规则见主仓库：[`TRADEMARKS.md`](https://github.com/brokermr810/QuantDinger/blob/master/TRADEMARKS.md)。

---

## 联系方式

- 官网：[quantdinger.com](https://quantdinger.com)  
- 商业授权与合作：见 [`LICENSE`](LICENSE) **第六节**中的邮箱与说明。
