# QuantDinger Mobile

<p align="right"><a href="README_CN.md">简体中文</a></p>

<p align="center">
  <a href="banner.png" title="Open full banner"><img src="banner.png" alt="QuantDinger Mobile app preview" width="720" /></a>
</p>

**QuantDinger Mobile** is the mobile and H5 client for [QuantDinger](https://github.com/brokermr810/QuantDinger), an open-source **AI Trading OS** by **Open Byte Inc**. It gives users a touch-friendly way to check markets, AI analysis, strategies, bots, quick trading, account settings, and exchange API workflows from a phone.

The same Vue 3 app can be deployed as:

- a web-based H5 app served by Docker or any static host
- an Android app through Capacitor
- an iOS app through Capacitor on macOS

## Recommended deployment

Most users should deploy mobile together with the main QuantDinger stack. The main repo pulls the published image and wires `/api` to the backend automatically.

Linux or macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/brokermr810/QuantDinger/main/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/brokermr810/QuantDinger/main/install.ps1 | iex
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
ghcr.io/brokermr810/quantdinger-mobile
```

Common tags are `latest`, semantic versions, and major/minor tags. In the main repo `.env`, use `IMAGE_TAG` to pin the whole stack or `MOBILE_TAG` to pin only the mobile service.

Run the image by itself when the backend already exists:

```bash
docker run -d --name quantdinger-mobile \
  -p 8889:80 \
  -e BACKEND_URL=http://host.docker.internal:5000 \
  ghcr.io/brokermr810/quantdinger-mobile:latest
```

`BACKEND_URL` controls the container's Nginx `/api/` proxy. In the main Compose stack it normally stays as `http://backend:5000`.

## Local development

### Requirements

| Tool | Version |
|------|---------|
| Node.js | Node 20.19+ or 22.12+. Node 22 LTS is recommended. |
| npm | Comes with Node. |
| Backend | QuantDinger API reachable at `http://localhost:5000`, unless you override the dev proxy. |
| Native builds | Android Studio for Android; macOS and Xcode for iOS. |

### Start H5 development

```bash
git clone https://github.com/brokermr810/QuantDinger-Mobile.git
cd QuantDinger-Mobile
npm install
npm run dev
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
VITE_DEV_API_TARGET=http://127.0.0.1:5000 npm run dev
```

If DevTools shows `http://localhost:5173/api/...`, that is expected. The browser calls Vite first, then Vite forwards the request to the backend.

## API URL behavior

Mobile and H5 deployments should usually call the backend through a same-origin `/api/` proxy. This avoids CORS issues and matches the Docker setup.

| Runtime | Recommended setup |
|---------|-------------------|
| Main Docker stack | Change nothing. Mobile is served on `MOBILE_PORT` and `/api/` is proxied to the backend service. |
| Standalone mobile Docker image | Pass `BACKEND_URL` if the backend is not reachable as `http://backend:5000`. |
| `npm run dev` | Set `VITE_DEV_API_TARGET` if the backend is not on `http://localhost:5000`. |
| Static H5 hosting | Serve `dist/` and configure your web server to proxy `/api/` to the backend. |
| Android / iOS shell | Use a backend URL that the phone can actually reach, such as `https://api.example.com` or a LAN IP during testing. |
| Preselect a default server URL | Build with `VITE_DEFAULT_SERVER_URL=https://api.example.com`; users can still override it in app settings. |

For a packaged APK/IPA, the default backend URL is baked in at build time. Users may still change it later in **Profile → Server settings**, but if you are distributing your own APK, set your own default URL before building.

Create or edit `.env.production`:

```env
VITE_DEFAULT_SERVER_URL=https://api.example.com
VITE_PUBLIC_WEB_BASE_URL=https://m.example.com
```

Notes:

- `VITE_DEFAULT_SERVER_URL` must be reachable from the phone, not only from your computer.
- Use HTTPS for public deployments. Some Android devices or networks may block insecure HTTP requests.
- Do not use `localhost` or `127.0.0.1` in an APK unless the backend is running on the phone itself.
- If you test on a LAN, use your computer's LAN IP, for example `http://192.168.1.10:5000`.
- The app removes the trailing slash automatically, so both `https://api.example.com` and `https://api.example.com/` are acceptable.

## Build

### H5 build

```bash
npm run build
npm run preview
```

Production assets are written to `dist/`.

For static hosting, configure:

- SPA fallback to `index.html`
- `/api/` reverse proxy to the QuantDinger backend
- HTTPS for public deployments
- OAuth redirect allowlists on the backend when OAuth login is enabled

### Android

Before building an APK for your own deployment, set the default backend in `.env.production`:

```env
VITE_DEFAULT_SERVER_URL=https://api.example.com
VITE_PUBLIC_WEB_BASE_URL=https://m.example.com
```

Then build:

```bash
npm install
npm run cap:assets
npm run build:android
cd android
./gradlew assembleDebug
```

On Windows PowerShell:

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
npm.cmd run cap:assets
npm.cmd run build:android
cd android
.\gradlew.bat assembleDebug
```

PowerShell one-off example without editing `.env.production`:

```powershell
$env:VITE_DEFAULT_SERVER_URL = "https://api.example.com"
$env:VITE_PUBLIC_WEB_BASE_URL = "https://m.example.com"
npm.cmd run build
npx.cmd cap sync android
cd android
.\gradlew.bat assembleDebug
```

Debug APK output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Release signing files are not committed. Keep keystores and signing properties in local secure storage or CI secrets.

### iOS

iOS builds require macOS and Xcode:

```bash
npm run cap:assets
npm run build:ios
npm run cap:ios
```

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
├── ios/                    # Capacitor iOS project
├── deploy/                 # Nginx template for Docker image
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
| OAuth redirects to the wrong place | Update backend `FRONTEND_URL` and `OAUTH_ALLOWED_REDIRECTS`, then restart or redeploy the backend. |

## Related repositories

| Repository | Role |
|------------|------|
| [QuantDinger](https://github.com/brokermr810/QuantDinger) | Backend API, Docker Compose, database services, deployment docs |
| [QuantDinger-Vue](https://github.com/brokermr810/QuantDinger-Vue) | Desktop web frontend |
| **QuantDinger-Mobile** | This repository: mobile and H5 frontend |

## License

This repository is released under the **QuantDinger Frontend Source-Available License v1.0**. See [`LICENSE`](./LICENSE) for the full text.

In short: non-commercial and qualified non-profit use is allowed under the license conditions; commercial use requires a separate written agreement with **Open Byte Inc**. Preserve copyright notices, the license file, and required QuantDinger attribution.

## Contact

- Website: [quantdinger.com](https://quantdinger.com)
- Telegram: [t.me/worldinbroker](https://t.me/worldinbroker)
- Email: [support@quantdinger.com](mailto:support@quantdinger.com)
