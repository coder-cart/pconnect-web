# PConnect Web

Next.js App Router frontend for the PConnect MVP collaboration platform.

## Prerequisites

- Node.js 20+
- Running PConnect API (`pconnect-api`)

## Setup

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
npm install
```

3. Start the web app:

```bash
npm run dev
```

The app runs at `http://localhost:7000` (and expects the API at `http://localhost:7001`).

## Demo login

Use any seeded account from the API seed script:

- `admin317@yopmail.com`
- `manager317@yopmail.com`
- `member317@yopmail.com`
- `client317@yopmail.com`

Password: `Password123!`

## Deploy to Vercel

This app is a standard Next.js project. The API runs separately (e.g. on Render via
`pconnect-api`).

### 1. Import the repo

1. In [Vercel](https://vercel.com/new), import the Git repository.
2. Set **Root Directory** to `pconnect-web` (the repo root is the monorepo, not this folder).
3. Framework preset should auto-detect **Next.js**. `vercel.json` is already included.

### 2. Environment variables

Add these in **Project → Settings → Environment Variables** (Production, and Preview if you
use preview deploys):

| Variable | Example | Required |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://pconnect-api.onrender.com/api` | Yes |
| `NEXT_PUBLIC_WS_URL` | `https://pconnect-api.onrender.com` | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_...` | No |

Use your real API hostname. Do **not** append a port — Render serves HTTPS on 443.

### 3. Allow the Vercel origin on the API

On the API host (Render dashboard → `pconnect-api` → Environment), set:

```bash
FRONTEND_URL=https://your-app.vercel.app
```

For preview deployments, add comma-separated origins, e.g.:

```bash
FRONTEND_URL=https://your-app.vercel.app,https://your-app-git-main-yourteam.vercel.app
```

Redeploy the API after changing `FRONTEND_URL` so CORS and Socket.IO accept the frontend.

### 4. Deploy

Push to the connected branch or click **Deploy**. Build command: `npm run build` (default).

### 5. Verify

- Open `https://your-app.vercel.app/login` and sign in with a seeded user.
- Check browser devtools → Network: API calls should go to your `NEXT_PUBLIC_API_URL`.
- Chat/realtime needs `NEXT_PUBLIC_WS_URL` and API `REDIS_URL` configured.

## Sprint 1 scope

- Login page
- Protected app shell with sidebar and top bar
- Placeholder and list pages for dashboard, chat, projects, tasks, clients, files, finance, and admin
- Loading, empty, error, and restricted states on list views
