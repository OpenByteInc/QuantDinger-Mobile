# QuantDinger Mobile

<p align="right"><a href="README_CN.md">简体中文</a></p>

**QuantDinger Mobile** is the official mobile and lightweight web client for the [QuantDinger](https://github.com/brokermr810/QuantDinger) quantitative platform. It is built with **Vue 3**, **Vite**, and **Capacitor 6**, and ships as **Android** and **iOS** native shells around the same web app you can also host as **standalone H5**. Connect it to your self-hosted stack or to the hosted service by pointing the app at a QuantDinger-compatible API base URL.

This repository is licensed under the same **source-available** terms as the [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) desktop frontend. See [License](#license) below and the [`LICENSE`](LICENSE) file for the full text.

---

## Table of contents

- [Why this client exists](#why-this-client-exists)
- [What you can do](#what-you-can-do)
- [How it talks to the backend](#how-it-talks-to-the-backend)
- [Repository map](#repository-map)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [npm scripts](#npm-scripts)
- [Configuring the API base URL](#configuring-the-api-base-url)
- [Android and iOS builds](#android-and-ios-builds)
- [H5 deployment](#h5-deployment)
- [OAuth and backend environment](#oauth-and-backend-environment)
- [Troubleshooting](#troubleshooting)
- [Related repositories](#related-repositories)
- [License](#license)
- [Contact](#contact)

---

## Why this client exists

QuantDinger’s main operator experience is a rich **desktop web** application. This project delivers a **touch-first, narrow-screen** experience for the same backend: watchlists, strategies, notifications, settings, AI-assisted flows, and trading-related views where implemented. You run one backend (or use the hosted one) and choose **desktop web**, **mobile native**, or **mobile H5** as the front door.

---

## What you can do

- Browse markets and manage watchlists (subject to backend capabilities).
- Inspect and control strategies, notifications, and account-oriented screens as exposed by the API.
- Switch **API base URL** in settings so a single build can target **dev**, **LAN**, **production**, or **SaaS**.
- Ship **Capacitor** wrappers for **Google Play** / sideloaded APK and **Apple** distribution workflows.
- Deploy the same `dist/` output as **SPA** behind Nginx (or similar) for a mobile web site.

Exact feature coverage evolves with the platform; treat the running app against your backend as the source of truth.

---

## How it talks to the backend

The client stores a **server base URL** (origin only, no path suffix). All REST calls use that origin plus routes such as `/api/health`, `/api/...`. A successful **Settings → Test connection** check hits `{base}/api/health`.

The default compiled default is defined in `src/config/index.js` (`DEFAULT_SERVER_URL`). Users override it in the UI; the value is persisted locally (e.g. `localStorage`).

---

## Repository map

```
quantdinger-mobile/
├── src/
│   ├── api/           # HTTP client and API modules
│   ├── assets/
│   ├── components/    # Shared Vue components
│   ├── config/        # Defaults (API base, public web base for shares, theme)
│   ├── router/
│   ├── stores/        # Pinia
│   ├── styles/
│   ├── utils/
│   ├── views/         # Feature screens
│   ├── App.vue
│   └── main.js
├── android/           # Capacitor Android project (after platform add / sync)
├── ios/               # Capacitor iOS project (macOS)
├── capacitor.config.json
├── vite.config.js
├── package.json
├── LICENSE            # QuantDinger Frontend Source-Available License v1.0
├── README.md          # This file (English)
└── README_CN.md       # Chinese README
```

---

## Tech stack

| Layer        | Choice                          |
|-------------|----------------------------------|
| UI framework | Vue 3                           |
| Build tool   | Vite                            |
| Native shell | Capacitor 6                     |
| Mobile UI    | Vant 4                          |
| State        | Pinia                           |
| Routing      | Vue Router 4 (history mode)     |
| i18n         | vue-i18n                        |
| HTTP         | Axios                           |

---

## Prerequisites

- **Node.js** 18 or newer (20.x or 22.x LTS recommended).
- **npm** (or compatible client) for installing dependencies.
- **Android Studio** and an Android SDK when building or debugging Android.
- **macOS**, **Xcode**, and an **Apple Developer** account for device deployment and App Store–style distribution.

---

## Getting started

```bash
git clone https://github.com/brokermr810/QuantDinger-Mobile.git
cd QuantDinger-Mobile
npm install
npm run dev
```

The dev server is the H5 experience. For native projects, add or sync platforms after a production build:

```bash
npx cap add android    # first time only, if not present
npx cap add ios        # first time only, on macOS
npm run build
npx cap sync
```

---

## npm scripts

| Script            | Purpose |
|-------------------|---------|
| `npm run dev`     | Start Vite dev server (H5). |
| `npm run build`   | Production build to `dist/`. |
| `npm run preview` | Preview the production build locally. |
| `npm run cap:sync` | Copy web assets into native projects. |
| `npm run cap:android` | Open the Android project in Android Studio. |
| `npm run cap:ios` | Open the iOS project in Xcode (macOS). |
| `npm run build:android` | `build` + sync Android. |
| `npm run build:ios` | `build` + sync iOS. |
| `npm run build:all` | `build` + sync all configured platforms. |

---

## Configuring the API base URL

Enter the **origin** your browser or WebView can reach, **without** a trailing slash. Examples:

| Scenario | Example base URL |
|----------|------------------|
| Nginx serves SPA and proxies `/api` to the backend | `https://m.example.com` |
| LAN Docker-style web on port 8888 | `http://192.168.1.10:8888` |
| Backend API only (CORS must allow the app origin) | `http://192.168.1.10:5000` |

After changing the URL, use **Test connection** in settings. If health checks fail, verify TLS, firewall, and that the backend is listening on the host and port you expect.

---

## Android and iOS builds

1. Run `npm run build:android` or `npm run build:ios`.
2. Open the native IDE (`npm run cap:android` / `cap:ios`).
3. Configure signing, package name / bundle identifier, icons, and store listings in the IDE or vendor consoles.

Capacitor documentation covers push plugins, splash screens, and store-specific packaging in detail; this README stays aligned with QuantDinger-specific wiring only.

---

## H5 deployment

1. Run `npm run build` and upload the contents of **`dist/`** to your static host root.
2. **Vue Router** uses **HTML5 history** mode. Your server must fall back to `index.html` for unknown paths, or deep links and refresh will 404.

Example Nginx pattern (adjust `server_name`, `root`, TLS, and upstream):

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

Sanity checks:

```bash
curl -sI https://m.example.com/          # expect 200, HTML
curl -sI https://m.example.com/login     # expect 200 (SPA fallback)
curl -sI https://m.example.com/api/health # expect 200 via proxy
```

---

## OAuth and backend environment

For **Google / GitHub** sign-in from your **H5** domain, the QuantDinger backend must allow redirects for that origin. Typical `backend_api_python/.env` entries include:

```bash
FRONTEND_URL=https://m.example.com/login
OAUTH_ALLOWED_REDIRECTS=https://m.example.com,https://m.example.com/login,https://ai.quantdinger.com,http://localhost:5173
```

Restart or rebuild the backend container after changes. If OAuth still lands on the wrong host, confirm the running image includes your latest configuration.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| 404 on `/login` or after refresh | SPA `try_files` / equivalent missing for the static host. |
| CORS or API errors | Prefer same-origin `/api/` proxy; or open CORS on the API for your H5 origin. |
| OAuth redirect mismatch | `OAUTH_ALLOWED_REDIRECTS` and `FRONTEND_URL` on the backend; rebuild/restart. |
| SSL handshake errors | Certificate chain, Nginx `ssl_protocols` (TLS 1.2+), `nginx -t`. |

---

## Related repositories

| Project | Role |
|---------|------|
| [QuantDinger](https://github.com/brokermr810/QuantDinger) | Backend API, Docker Compose, documentation, prebuilt desktop web bundle |
| [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) | Desktop web UI source (same license family as this repo) |
| **QuantDinger-Mobile** | This repository: mobile + H5 client |

---

## License

This software is released under the **QuantDinger Frontend Source-Available License, Version 1.0** (see [`LICENSE`](LICENSE)). It is the **same legal text** as the [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) repository.

- **Non-commercial** and **qualified non-profit** uses are permitted **free of charge** under the conditions in the license.
- **Commercial use** requires a **separate written agreement** with the copyright holder.
- You must **preserve** copyright notices, the license file, and in-app **QuantDinger** attribution / branding as required by Section 3.1 of the license.

Project-wide trademark guidance: [`TRADEMARKS.md`](https://github.com/brokermr810/QuantDinger/blob/master/TRADEMARKS.md) in the main QuantDinger repository.

---

## Contact

- Website: [quantdinger.com](https://quantdinger.com)  
- Commercial licensing and partnerships: see **Section 6** of [`LICENSE`](LICENSE) (email listed there).
