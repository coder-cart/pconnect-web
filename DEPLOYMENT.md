# Deployment Guide — PConnect Web (Vercel)

The frontend deploys to **Vercel**. It depends on the API (`pconnect-api`) being
deployed first on Render, since it needs the API URL.

## Prerequisites

- The `pconnect-api` service is live on Render (e.g. `https://pconnect-api.onrender.com`).
  See `pconnect-api/DEPLOYMENT.md` for the full stack order (Neon → Render → Vercel).

## Steps

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and **import** the `pconnect-web` repo.
3. **Framework Preset:** Next.js (auto-detected). Leave Build/Output settings at defaults
   (`next build`).
4. Add **Environment Variables** (Production, and Preview if you use it):

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://pconnect-api.onrender.com/api` |
   | `NEXT_PUBLIC_WS_URL` | `https://pconnect-api.onrender.com` |

   Replace the host with your actual Render URL. Note:
   - `NEXT_PUBLIC_API_URL` **ends with `/api`**.
   - `NEXT_PUBLIC_WS_URL` is the bare origin (no `/api`, no trailing slash).

5. Click **Deploy**. Note the resulting URL, e.g. `https://pconnect.vercel.app`.
6. **Final step (back on Render):** set `FRONTEND_URL` on the `pconnect-api` service to this
   Vercel URL so CORS and WebSocket connections are allowed. See `pconnect-api/DEPLOYMENT.md`.

## Notes

- `NEXT_PUBLIC_*` variables are **public** (embedded in the client bundle). Never put
  secrets here.
- The Content-Security-Policy in `next.config.ts` automatically allows the origins from
  `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL`, so no extra CSP config is needed.
- If you change the env vars after the first deploy, trigger a **redeploy** — Next.js
  inlines `NEXT_PUBLIC_*` values at build time.
