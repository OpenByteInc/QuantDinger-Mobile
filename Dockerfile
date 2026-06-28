# QuantDinger Mobile web image published to GHCR.
#
# The Vite build runs once on the native builder platform. The generated
# static assets are architecture-neutral, so the nginx stage can publish a
# cheap multi-arch image for linux/amd64 and linux/arm64.

ARG NODE_IMAGE=node:22-alpine
ARG NGINX_IMAGE=nginx:1.27-alpine

FROM --platform=$BUILDPLATFORM ${NODE_IMAGE} AS builder
ARG APP_VERSION=""
ARG GIT_TAG=""
WORKDIR /app

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .
RUN APP_VERSION="$APP_VERSION" GIT_TAG="$GIT_TAG" npm run build

FROM ${NGINX_IMAGE}

RUN apk add --no-cache curl

ENV NGINX_ENVSUBST_FILTER=BACKEND_URL \
    BACKEND_URL=http://backend:5000

COPY deploy/nginx-mobile.conf /etc/nginx/templates/default.conf.template
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -fsS http://127.0.0.1/health >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
