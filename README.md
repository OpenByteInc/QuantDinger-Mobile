# QuantDinger Mobile

<p align="right"><a href="README_CN.md">简体中文</a></p>

<p align="center">
  <a href="banner-v2.png" title="Open full banner"><img src="banner-v2.png" alt="QuantDinger Mobile app preview" width="720" /></a>
</p>

**QuantDinger Mobile** is the source-available mobile and H5 client for the [QuantDinger](https://github.com/OpenByteInc/QuantDinger) **AI Trading OS** by **Open Byte Inc**. It turns the desktop platform's most useful daily workflows into a focused phone experience: strategy discovery, live operations, AI research, charts and trading, marketplace purchases, and account management.

Live mobile site: [m.quantdinger.com](https://m.quantdinger.com)

The same Vue 3 app can be deployed as:

- a web-based H5 app served by Docker or any static host
- an Android app through Capacitor
- an iOS app through Capacitor on macOS

## Product experience

The current navigation is organized around five daily workflows:

| Area | What it is for |
|------|----------------|
| Home | Discover data-backed strategies by preference, compare return, drawdown, Sharpe and payoff metrics, and follow a personal market watchlist. |
| Run | Start and monitor live or signal-only strategy instances, inspect positions, orders, trades, P&L and strategy health. |
| AI Research | Select a symbol and ask for an evidence-linked professional report, trend check, news impact, or opportunity and risk review. |
| Indicators | View multi-market charts and signals, switch symbols and venues, and place reviewed orders through supported connected accounts. |
| Me | Manage exchange and broker credentials, purchases, credits and membership, notifications, account security, language, display mode and accent themes. |

The interface ships in Simplified Chinese, Traditional Chinese, English, Japanese and Korean. Its layouts are tuned for narrow phone screens and safe areas as well as desktop browser previews.

Additional flows are reached from those five entry points:

- **Strategy and indicator marketplace:** search, filter, sort and paginate catalog items; compare performance and pricing; distinguish source-visible and source-protected assets; purchase with credits; review owned items and compatibility.
- **Strategy launch:** select a saved or purchased strategy, choose a compatible account, run live or signal-only, configure parameters and notifications, and acknowledge live-trading risk before submission.
- **Strategy operations:** inspect health, delay, pending orders, equity, P&L, positions, exchange orders, fills, AI review and strategy logs; start, stop, edit or delete when the current state permits it.
- **Chart trading:** crypto spot and perpetual market/limit orders, spot sells by base-asset quantity, leverage and margin mode for perpetuals, optional take-profit/stop-loss, positions, order history and explicit confirmation before live submission. Supported US stock accounts use a dedicated share-order flow.
- **AI research:** symbol-aware conversations, professional reports, trend checks, news impact, opportunity and risk analysis, chart attachments, conversation history and memory.
- **Account and security:** email/password and enabled OAuth login, MFA, login history, profile editing, referrals, exchange/broker credentials, notification channels, credits, membership and configured payment methods.

Some capabilities appear only when the backend enables the related provider, exchange, payment method or notification channel.

## Recommended deployment

Most users should deploy mobile together with the main QuantDinger stack. The main repo pulls the published image and wires `/api` to the backend automatically.

Linux or macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/OpenByteInc/QuantDinger/main/install.ps1 | iex
```

Default URLs in the full stack:

| Client | URL |
|--------|-----|
| Desktop web | `http://localhost:8888` |
| Mobile H5 | `http://localhost:8889` |
| Backend API | Proxied by the frontend containers through `/api/` |

When opening from a phone on the same LAN, use the host machine's LAN IP, for example `http://192.168.1.10:8889`.

## GHCR image

The mobile image is published as:

```text
ghcr.io/openbyteinc/quantdinger-mobile
```

Common tags are `latest`, semantic versions, and major/minor tags. In the main repo `.env`, use `IMAGE_TAG` to pin the whole stack or `MOBILE_TAG` to pin only the mobile service.

Run the image by itself when the backend already exists:

```bash
docker run -d --name quantdinger-mobile \
  -p 8889:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/openbyteinc/quantdinger-mobile:latest
```

`BACKEND_URL` controls the container's Nginx `/api/` proxy. In the main Compose stack it normally stays as `http://backend:5000`.

## Local development

### Requirements

| Tool | Version |
|------|---------|
| Node.js | Node 20.19+ or 22.12+. Node 22 LTS is recommended. |
| pnpm | pnpm 11, matching the `packageManager` field. Corepack is recommended. |
| Backend | QuantDinger API reachable at `http://localhost:5000`, unless you override the dev proxy. |
| Native builds | Android Studio for Android; macOS and Xcode for iOS. |

### Start H5 development

```bash
git clone https://github.com/OpenByteInc/QuantDinger-Mobile.git
cd QuantDinger-Mobile
corepack enable
pnpm install
pnpm dev
```

Open:

```text
http://localhost:5173
```

The Vite dev server proxies `/api/*` to:

```text
http://localhost:5000
```

Override the backend target when needed:

```bash
VITE_DEV_API_TARGET=http://127.0.0.1:5000 pnpm dev
```

If DevTools shows `http://localhost:5173/api/...`, that is expected. The browser calls Vite first, then Vite forwards the request to the backend.

## API URL behavior

Mobile and H5 deployments should usually call the backend through a same-origin `/api/` proxy. This avoids CORS issues and matches the Docker setup.

| Runtime | Recommended setup |
|---------|-------------------|
| Main Docker stack | Change nothing. Mobile is served on `MOBILE_PORT` and `/api/` is proxied to the backend service. |
| Standalone mobile Docker image | Pass `BACKEND_URL` if the backend is not reachable as `http://backend:5000`. |
| `pnpm dev` | Set `VITE_DEV_API_TARGET` if the backend is not on `http://localhost:5000`. |
| Static H5 hosting | Serve `dist/` and configure your web server to proxy `/api/` to the backend. |
| Included Android remote-H5 shell | Loads `https://m.quantdinger.com` and normally uses that site's same-origin `/api/` proxy. |
| Self-hosted remote-H5 shell | Point Capacitor `server.url` to your own HTTPS mobile site and proxy `/api/` there. |
| Bundled native web assets | Build with `VITE_DEFAULT_SERVER_URL=https://api.example.com`; the URL must be reachable from the phone. |

`VITE_DEFAULT_SERVER_URL` belongs to the Vite bundle. The included Android project instead uses the remote site from `capacitor.config.json`, so deploying that site updates normal Vue UI and API behavior without rebuilding the APK. If you distribute a bundled-assets app or a shell for another site, set the values through the build environment or your local `.env.local`; do not commit a private endpoint.

For example, create or edit `.env.local` on the build machine:

```env
VITE_DEFAULT_SERVER_URL=https://api.example.com
VITE_PUBLIC_WEB_BASE_URL=https://m.example.com
```

Notes:

- The repository does not ship a hard-coded `.env.production`. Prebuilt H5 and Docker images therefore use same-origin `/api/` and continue to honor `BACKEND_URL`.
- `VITE_DEFAULT_SERVER_URL` must be reachable from the phone, not only from your computer.
- Use HTTPS for public deployments. Some Android devices or networks may block insecure HTTP requests.
- Do not use `localhost` or `127.0.0.1` in an APK unless the backend is running on the phone itself.
- If you test on a LAN, use your computer's LAN IP, for example `http://192.168.1.10:5000`.
- The app removes the trailing slash automatically, so both `https://api.example.com` and `https://api.example.com/` are acceptable.

## Google and GitHub OAuth

H5 and the native shell use the same backend OAuth endpoints, but the native shell opens the provider in the system browser. Configure all three parts of the route:

```env
FRONTEND_URL=https://app.example.com,https://m.example.com
OAUTH_ALLOWED_REDIRECTS=com.quantdinger.mobile://login
GOOGLE_REDIRECT_URI=https://api.example.com/api/auth/oauth/google/callback
GITHUB_REDIRECT_URI=https://api.example.com/api/auth/oauth/github/callback
```

- Register `GOOGLE_REDIRECT_URI` exactly in Google Cloud Console. The provider callback belongs to the backend API; it is not the mobile homepage.
- Keep the mobile HTTPS origin in `FRONTEND_URL` so `/api/auth/oauth/google` may retain the correct frontend target.
- Keep `com.quantdinger.mobile://login` in `OAUTH_ALLOWED_REDIRECTS` so the completed native login can return to the installed app.
- When `VITE_DEFAULT_SERVER_URL` is unset, the native remote-H5 shell now turns the current `https://m.example.com` origin into an absolute OAuth start URL before calling Capacitor Browser. This is required because the native browser plugin cannot open a relative `/api/...` URL.
- Android already declares the matching `com.quantdinger.mobile://login` intent filter. Native manifest or plugin changes still require rebuilding the app package.

## Build

### H5 build

```bash
pnpm build
pnpm preview
```

Production assets are written to `dist/`.

For static hosting, configure:

- SPA fallback to `index.html`
- `/api/` reverse proxy to the QuantDinger backend
- HTTPS for public deployments
- OAuth redirect allowlists on the backend when OAuth login is enabled

### Native remote H5 shell

The committed Android shell, and an iOS shell generated from the same Capacitor configuration, load the hosted mobile site directly:

```json
{
  "server": {
    "url": "https://m.quantdinger.com"
  }
}
```

With this mode, most Vue UI, route, copy, theme, and API-call changes go live by deploying `m.quantdinger.com`; users do not need to reinstall the APK. Rebuild the APK/IPA only for native shell changes such as Capacitor plugins, permissions, app icon, splash screen, package metadata, or store-required updates.

### Android

Before building an APK for your own deployment, set the default backend in `.env.production`:

```env
VITE_DEFAULT_SERVER_URL=https://api.example.com
VITE_PUBLIC_WEB_BASE_URL=https://m.example.com
```

Then build:

```bash
corepack enable
pnpm install
pnpm cap:assets
pnpm build:android
cd android
./gradlew assembleDebug
```

On Windows PowerShell:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
pnpm.cmd cap:assets
pnpm.cmd build:android
cd android
.\gradlew.bat assembleDebug
```

PowerShell one-off example without editing `.env.production`:

```powershell
$env:VITE_DEFAULT_SERVER_URL = "https://api.example.com"
$env:VITE_PUBLIC_WEB_BASE_URL = "https://m.example.com"
pnpm.cmd build
pnpm.cmd exec cap sync android
cd android
.\gradlew.bat assembleDebug
```

Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Release signing files are not committed. Keep keystores and signing properties in local secure storage or CI secrets.

### iOS

iOS builds require macOS and Xcode. The generated `ios/` project is intentionally not committed, so create it once before the first build:

```bash
pnpm install
pnpm exec cap add ios
pnpm cap:assets
pnpm build:ios
pnpm cap:ios
```

Before testing native OAuth on iOS, register `com.quantdinger.mobile://login` under `CFBundleURLTypes` in the generated Xcode project.

## Validation

```bash
pnpm test:unit
pnpm build
```

The unit suite covers locale completeness, trading payloads and guards, strategy ranking, marketplace boundaries, theme configuration, AI report handling and native OAuth URL construction.

## Project structure

```text
QuantDinger-Mobile/
├── src/
│   ├── api/                # HTTP client and API modules
│   ├── assets/             # Images and static assets
│   ├── components/         # Shared mobile components
│   ├── config/             # Default server URL, public H5 URL, theme
│   ├── router/             # Vue Router 4
│   ├── stores/             # Pinia stores
│   ├── styles/             # Global styles
│   ├── utils/              # Utility helpers
│   └── views/              # Page-level modules
├── android/                # Capacitor Android project
├── public/                 # Web manifest and public assets
├── resources/              # Native icon and splash sources
├── tests/                  # Unit and browser regression checks
├── deploy/                 # Nginx template for Docker image
├── .github/workflows/      # Versioned GHCR and static-bundle release
├── capacitor.config.json
├── vite.config.js
├── package.json
└── LICENSE
```

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | Vue 3 |
| Build | Vite 7 |
| Native shell | Capacitor 6 |
| Mobile UI | Vant 4 |
| State | Pinia |
| Router | Vue Router 4 |
| i18n | vue-i18n |
| HTTP | Axios |

## Troubleshooting

| Symptom | What to check |
|---------|---------------|
| Vite says Node 20.19+ or 22.12+ is required | Switch to Node 22 LTS. |
| H5 route refresh returns 404 | Configure SPA fallback to `index.html`. |
| API calls fail in H5 | Prefer a same-origin `/api/` proxy, or explicitly allow the H5 origin in backend CORS settings. |
| Phone cannot reach local backend | Use the computer's LAN IP, not `localhost`, because `localhost` on the phone means the phone itself. |
| Docker image starts but API fails | Check `BACKEND_URL` from inside the container network. |
| OAuth fails immediately only in the installed app | Confirm the deployed bundle contains the absolute native OAuth URL fix and that the mobile site's same-origin `/api/` proxy is reachable. Capacitor Browser cannot open a relative `/api/...` URL. |
| OAuth opens the provider but returns to the wrong place | Update backend `FRONTEND_URL` and `OAUTH_ALLOWED_REDIRECTS`, then restart or redeploy the backend. |

## Related repositories

| Repository | Role |
|------------|------|
| [QuantDinger](https://github.com/OpenByteInc/QuantDinger) | Backend API, Docker Compose, database services, deployment docs |
| [QuantDinger-Vue](https://github.com/OpenByteInc/QuantDinger-Vue) | Desktop web frontend |
| **QuantDinger-Mobile** | This repository: mobile and H5 frontend |

## License

This repository is released under the **QuantDinger Frontend Source-Available License v1.0**. See [`LICENSE`](./LICENSE) for the full text.

In short: non-commercial and qualified non-profit use is allowed under the license conditions; commercial use requires a separate written agreement with **Open Byte Inc**. Preserve copyright notices, the license file, and required QuantDinger attribution.

## Contact

- Website: [quantdinger.com](https://quantdinger.com)
- Telegram: [t.me/worldinbroker](https://t.me/worldinbroker)
- Email: [support@quantdinger.com](mailto:support@quantdinger.com)
