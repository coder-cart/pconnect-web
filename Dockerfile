# PConnect web — production image. Build context: pconnect-web.
# NEXT_PUBLIC_* values are baked in at build time.

FROM node:20-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=1024

ARG NEXT_PUBLIC_API_URL=https://colabdeck.com/api
ARG NEXT_PUBLIC_WS_URL=https://colabdeck.com
ARG NEXT_PUBLIC_WS_PATH=/socket.io

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_WS_PATH=$NEXT_PUBLIC_WS_PATH

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=6001

RUN groupadd -r web \
  && useradd -r -g web -d /app web

COPY --from=builder --chown=web:web /app/public ./public
COPY --from=builder --chown=web:web /app/.next/standalone ./
COPY --from=builder --chown=web:web /app/.next/static ./.next/static

USER web

EXPOSE 6001

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:6001/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
