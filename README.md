# QuantDinger Mobile

📱 QuantDinger 移动端应用 - 基于 Vue 3 + Capacitor

## 技术栈

- **Vue 3** - 前端框架
- **Vite** - 构建工具
- **Capacitor 6** - 跨平台打包
- **Vant 4** - 移动端 UI 组件库
- **Pinia** - 状态管理
- **Vue Router 4** - 路由管理

## 项目结构

```
QuantDinger-Mobile/
├── src/
│   ├── api/          # API 接口
│   ├── assets/       # 静态资源
│   ├── components/   # 公共组件
│   ├── router/       # 路由配置
│   ├── stores/       # Pinia 状态
│   ├── styles/       # 全局样式
│   ├── utils/        # 工具函数
│   ├── views/        # 页面组件
│   ├── App.vue       # 根组件
│   └── main.js       # 入口文件
├── android/          # Android 原生项目（需要运行 cap add android）
├── ios/              # iOS 原生项目（需要运行 cap add ios）
├── capacitor.config.json  # Capacitor 配置
├── vite.config.js    # Vite 配置
└── package.json
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器（H5）
npm run dev

# 构建生产版本
npm run build

# 添加 Android 平台
npx cap add android

# 添加 iOS 平台（需要 Mac）
npx cap add ios

# 同步代码到原生项目
npm run cap:sync

# 打开 Android Studio
npm run cap:android

# 打开 Xcode（需要 Mac）
npm run cap:ios

# 一键构建 Android
npm run build:android

# 一键构建 iOS
npm run build:ios
```

## 配置后端地址

在设置页面配置服务器地址，例如：
- 本地开发：`http://localhost:8000`
- 局域网：`http://192.168.1.100:8000`
- 公网：`https://your-domain.com`

## 打包 APK

1. 运行 `npm run build:android`
2. 打开 Android Studio
3. Build → Generate Signed Bundle / APK
4. 选择 APK，配置签名
5. 选择 release 版本
6. 生成 APK

## 打包 IPA（需要 Mac）

1. 运行 `npm run build:ios`
2. 打开 Xcode
3. Product → Archive
4. Distribute App

## 功能规划

- [x] 首页 - 账户概览、策略状态、最近信号
- [x] 行情 - 自选列表、实时价格
- [x] 策略 - 策略列表、启动/停止
- [x] 通知 - 信号通知列表
- [x] 设置 - 服务器配置、通知设置
- [ ] K 线图表
- [ ] 推送通知
- [ ] 生物识别登录

## 注意事项

1. 当前 Node 版本（18.x）与部分依赖的推荐版本不完全匹配，但功能正常
2. 如遇问题，建议升级 Node 到 20.x 或 22.x
3. iOS 打包需要 Mac 和 Apple 开发者账号

## H5 部署（m.quantdinger.com）

### 构建产物

```bash
npm run build
# 产物在 dist/ 目录，把整个 dist 内容上传到服务器站点根目录
# 默认路径（示例）：/www/sites/m.quantdinger.com/index
```

### Nginx 站点配置

Vue Router 使用 `history` 模式，必须配置 SPA fallback（`try_files ... /index.html`），
否则 `/login`、`/trading`、`/trading/strategy/:id` 等路由直接访问或刷新会 404。
另外后端 API 建议同源反向代理到 `127.0.0.1:5000`，避免跨子域 CORS 配置。

**完整站点配置**（覆盖面板生成的默认配置即可）：

```nginx
# ========== HTTP 自动跳 HTTPS ==========
server {
    listen 80;
    server_name m.quantdinger.com;

    # Let's Encrypt 续签路径
    location ^~ /.well-known/acme-challenge {
        allow all;
        root /usr/share/nginx/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# ========== HTTPS 主站 ==========
server {
    listen 443 ssl http2;
    server_name m.quantdinger.com;

    # —— SSL（证书路径按实际修改）——
    ssl_certificate     /www/sites/m.quantdinger.com/ssl/fullchain.pem;
    ssl_certificate_key /www/sites/m.quantdinger.com/ssl/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK:!KRB5:!SRP:!CAMELLIA:!SEED;
    ssl_prefer_server_ciphers on;
    ssl_session_cache   shared:SSL:10m;
    ssl_session_timeout 10m;
    add_header Strict-Transport-Security "max-age=31536000" always;
    error_page 497 https://$host$request_uri;

    # —— 站点根目录（手机端 dist）——
    root  /www/sites/m.quantdinger.com/index;
    index index.html;

    # —— 日志 ——
    access_log /www/sites/m.quantdinger.com/log/access.log main;
    error_log  /www/sites/m.quantdinger.com/log/error.log;

    # —— Let's Encrypt 续签路径 ——
    location ^~ /.well-known/acme-challenge {
        allow all;
        root /usr/share/nginx/html;
    }

    # —— 反向代理到后端 API（同源，免 CORS）——
    # 若后端不在本机，把 127.0.0.1:5000 改成实际内网地址
    location /api/ {
        proxy_pass         http://127.0.0.1:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        $http_connection;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    # —— 静态资源缓存（Vite 打包后文件名带 hash，可长缓存）——
    location ~* \.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp|map)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
        access_log off;
    }

    # —— index.html 不缓存（保证发新版本后用户立即看到）——
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        expires off;
    }

    # —— SPA history 模式兜底（关键，放最后）——
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 应用配置

```bash
# 1. 覆盖旧配置（1Panel 示例路径）
#    /opt/1panel/apps/openresty/openresty/conf/conf.d/m.quantdinger.com.conf
# 2. 语法检查
nginx -t
# 3. reload（不断连接）
nginx -s reload
```

### 部署验证

```bash
curl -sI https://m.quantdinger.com/           | head -5   # 200 text/html
curl -sI https://m.quantdinger.com/login      | head -5   # 200 text/html（SPA fallback）
curl -sI https://m.quantdinger.com/api/health | head -5   # 200，后端反代正常
```

### 后端环境变量（`backend_api_python/.env`）

支持 Google / GitHub OAuth 从手机端回跳，必须把 m.quantdinger.com 加进白名单：

```bash
FRONTEND_URL=https://m.quantdinger.com/login
OAUTH_ALLOWED_REDIRECTS=https://m.quantdinger.com,https://m.quantdinger.com/login,https://ai.quantdinger.com,http://localhost:5173
```

改完 `.env` 重启后端：

```bash
docker compose restart backend
```

后端 Python 代码有改动时记得重新构建镜像：

```bash
docker compose up -d --build backend
```

### 常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| 直接访问 `/login` 或 OAuth 回跳后 404 | Nginx 没配 SPA fallback | 检查 `location /` 里有没有 `try_files $uri $uri/ /index.html;` |
| `ERR_SSL_PROTOCOL_ERROR` | Nginx 配置加载失败 / 协议含 `TLSv1` `TLSv1.1` 被浏览器拒 | `nginx -t` 检查，`ssl_protocols` 只保留 `TLSv1.2 TLSv1.3` |
| API 404 / CORS 报错 | 没配反向代理，或后端没启动 | 检查 `location /api/`，`curl -I http://127.0.0.1:5000/api/health` |
| Google 登录回到 PC 页 | 后端旧镜像 / `OAUTH_ALLOWED_REDIRECTS` 未加手机域名 | `docker compose up -d --build backend`，检查 `.env` |
| 登录回跳地址为 `.../login/#/user/login?oauth_token=...` | 后端是旧镜像没拿到新代码 | 同上 `--build` |
