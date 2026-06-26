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

## Sprint 1 scope

- Login page
- Protected app shell with sidebar and top bar
- Placeholder and list pages for dashboard, chat, projects, tasks, clients, files, finance, and admin
- Loading, empty, error, and restricted states on list views
