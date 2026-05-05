# QuantDinger Mobile · 移动端

**English:** Official companion app for [QuantDinger](https://github.com/brokermr810/QuantDinger)—Vue 3 + Vite + **Capacitor 6** (Android / iOS) and **H5**. Point it at your self-hosted API or the hosted service; OAuth and deep links work when the backend allows your mobile/H5 origin.

**中文：** [QuantDinger](https://github.com/brokermr810/QuantDinger) 的官方配套客户端：基于 **Vue 3 + Vite + Capacitor 6**，可打 **Android / iOS** 包，也可作为 **H5** 部署。在「设置 → 服务器」填写后端 **API 根地址**（能访问到 `/api/health` 的 Origin），即可对接自托管或 SaaS；需在服务端配置允许的 OAuth 回跳域名。

---

## License / 开源许可

**English:** This repository is distributed under the **QuantDinger Frontend Source-Available License v1.0**—the **same license text** as [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) (`LICENSE` in this repo). In short:

- **Non-commercial** use and **qualified non-profit** use are **free** under the terms in `LICENSE`.
- **Commercial use** requires a **separate commercial license** from the copyright holder.
- You must **retain** copyright notices, the full license text, and any **“Powered by QuantDinger”** (or similar) branding—**do not remove or misrepresent** them without written permission.

**中文：** 本仓库使用与 [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) **相同**的 **《QuantDinger Frontend Source-Available License v1.0》**（见本仓库根目录 **`LICENSE`**）。要点：

- **非商业**与**符合条件的非营利/教育等**用途，在遵守条款前提下**免费**使用。
- **商业用途**需向版权方**另行取得商业授权**。
- 须**保留**版权声明、完整许可证正文及应用内 **QuantDinger** 相关署名/水印；未经许可不得删除或篡改。

Trademark / branding rules for the wider project: see the main repo [`TRADEMARKS.md`](https://github.com/brokermr810/QuantDinger/blob/master/TRADEMARKS.md).

---

## Related repositories / 相关仓库

| Repository | Role |
|------------|------|
| [QuantDinger](https://github.com/brokermr810/QuantDinger) | Backend, Docker Compose, docs, prebuilt **desktop web** UI |
| [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) | **Desktop web** UI source (same source-available license) |
| **QuantDinger-Mobile** (this repo) | **Mobile + H5** client |

---

## Tech stack / 技术栈

| | |
|--|--|
| **English** | Vue 3, Vite, Capacitor 6, Vant 4, Pinia, Vue Router, vue-i18n, Axios |
| **中文** | Vue 3、Vite、Capacitor 6、Vant 4、Pinia、Vue Router、vue-i18n、Axios |

---

## Project layout / 项目结构

**English:** High-level layout (native folders appear after `npx cap add android|ios`):

**中文：** 顶层结构如下（执行 `npx cap add android` / `ios` 后会生成原生工程目录）：

```text
quantdinger-mobile/
├── src/
│   ├── api/          # API layer / API 封装
│   ├── assets/
│   ├── components/   # Shared components / 公共组件
│   ├── config/       # Defaults (e.g. API base) / 默认配置
│   ├── router/
│   ├── stores/
│   ├── styles/
│   ├── utils/
│   ├── views/
│   ├── App.vue
│   └── main.js
├── android/          # Android project (Capacitor) / Android 工程
├── ios/              # iOS project (Capacitor, macOS only) / iOS 工程
├── capacitor.config.json
├── vite.config.js
└── package.json
```

---

## Prerequisites / 环境要求

**English:** Node.js **18+** (20.x or 22.x recommended), npm, Android Studio for Android builds; Xcode + Apple Developer account for iOS release builds.

**中文：** Node.js **18+**（建议 20 / 22 LTS）、npm；Android 打包需 **Android Studio**；iOS 上架需 **macOS + Xcode + 开发者账号**。

---

## Commands / 常用命令

**English:**

```bash
npm install          # dependencies
npm run dev          # Vite dev server (H5)
npm run build        # production build → dist/
npm run cap:sync     # sync web build to native projects
npm run cap:android  # open Android Studio
npm run cap:ios      # open Xcode (macOS)
npm run build:android
npm run build:ios
```

**中文：** 安装依赖 → 本地调试 H5 → `build` 出 `dist/` → `cap:sync` 同步到原生工程 → 用 Android Studio / Xcode 打包。

---

## Backend URL / 后端地址怎么填

**English:** The app prepends your saved **server base URL** to API paths (e.g. `{base}/api/health`). Use the **origin** only—**no trailing slash**, typically:

- Reverse-proxy entry (Nginx serves both static and `/api`): `https://m.example.com` or `http://<LAN-IP>:8888`
- Direct API port (if you expose Flask only and CORS allows the app): `http://<host>:5000`

Default baked into `src/config/index.js` is `https://api.quantdinger.com`; override in **Settings → Server** (persisted in `localStorage`).

**中文：** 填写 **API 的根 Origin**（协议 + 主机 + 端口），**不要**末尾 `/`。应用会请求 `{地址}/api/health` 等。常见写法：

- 反代统一入口（静态 + `/api` 同源）：`https://m.example.com` 或 `http://局域网IP:8888`
- 仅暴露后端 API（且已配置 CORS）：`http://主机:5000`

默认内置地址见 `src/config/index.js`；用户可在 **设置 → 服务器** 覆盖（存 `localStorage`）。

---

## Native release builds / 原生发布提要

**English:** After `npm run build:android` or `build:ios`, open the native IDE to sign, bump `applicationId` / bundle ID if you fork, and ship through Play Store / TestFlight / App Store as usual.

**中文：** 执行 `build:android` / `build:ios` 后用各 IDE 完成签名与上架；若 Fork 应用，请修改 `appId`、包名与图标等品牌相关配置。

---

## H5 deployment / H5 部署（SPA + API 反代）

**English:** Deploy `dist/` to your site root. Vue Router uses **history** mode—you **must** use `try_files ... /index.html`. Prefer proxying `/api/` to the QuantDinger backend on the **same origin** to avoid CORS. Below is a **reference** Nginx snippet (adjust paths and SSL).

**中文：** 将 `npm run build` 的 **`dist/`** 整包放到站点根目录。路由为 **history** 模式，**必须**配置 SPA 回退 `try_files $uri $uri/ /index.html`。建议将 **`/api/`** 反代到后端，与前端**同源**以省 CORS。以下为 **Nginx 参考**（路径与证书请按环境修改）。

```nginx
server {
    listen 443 ssl http2;
    server_name m.quantdinger.com;
    root /www/sites/m.quantdinger.com/index;
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

**English:** Validate with e.g. `curl -sI https://your-host/login` (should be `200`) and `curl -sI https://your-host/api/health`.

**中文：** 自检示例：`curl -sI https://你的域名/login` 应为 `200`；`curl -sI https://你的域名/api/health` 应能打到后端。

---

## Backend environment (OAuth) / 后端环境变量（OAuth）

**English:** For Google / GitHub login from the mobile **H5 origin**, add your site to the backend allow list, e.g. in `backend_api_python/.env`:

**中文：** 若在手机 **H5 域名**使用 OAuth，请在后端 `backend_api_python/.env` 等处把该域名加入白名单，例如：

```bash
FRONTEND_URL=https://m.quantdinger.com/login
OAUTH_ALLOWED_REDIRECTS=https://m.quantdinger.com,https://m.quantdinger.com/login,https://ai.quantdinger.com,http://localhost:5173
```

Then restart / rebuild the backend container after changes.

---

## Troubleshooting / 常见问题

| Symptom / 现象 | Cause / 原因 | Fix / 处理 |
|----------------|--------------|------------|
| `/login` or refresh 404 | Missing SPA fallback | Add `try_files $uri $uri/ /index.html;` in `location /` |
| API or CORS errors | No `/api/` proxy or wrong base URL | Fix Nginx `proxy_pass` or the server URL in app settings |
| OAuth lands on wrong site | Stale backend image or redirect list | Rebuild backend; update `OAUTH_ALLOWED_REDIRECTS` |
| SSL errors | Bad Nginx TLS config | `nginx -t`; use TLS 1.2+ only |

---

## Roadmap / 功能规划

**English:** Feature areas evolve with the main platform; typical modules include home overview, watchlists, strategies, notifications, settings, AI analysis flows, and chart components. Push notifications and biometric login may require extra native setup.

**中文：** 功能随主版本迭代，当前包含首页、行情、策略、通知、设置、AI 分析等模块；**推送通知**、**生物识别登录**等需额外原生能力与配置。

---

## Contact / 联系

**English:** Commercial licensing (same license family as QuantDinger-Vue): see **`LICENSE`** §6—[quantdinger.com](https://quantdinger.com), [brokermr810@gmail.com](mailto:brokermr810@gmail.com).

**中文：** 商业授权与 Vue 前端同源许可体系，联系方式见 **`LICENSE`** 第六节或 [quantdinger.com](https://quantdinger.com)。
