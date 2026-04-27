# Stacks Whale Alert

A service for monitoring large STX transfers on the Stacks network. The project consists of two main parts:

1. **Node.js bot** — checks recent transactions, filters large transfers, enriches them with additional data, and sends alerts to X and Telegram.
2. **React/Vite dashboard** — a separate frontend for viewing recent transactions and the STX price.

## How it works

### 1. Monitoring bot
The main logic is located in `index.js`.

Current workflow:
- the bot fetches recent transactions from the Hiro API;
- processes token transfer transactions;
- converts the amount from micro-STX to STX;
- filters transactions from the configured whale threshold, defaulting to **100,000 STX**;
- applies known wallet labels and only uses the legacy Hiro BNS lookup when explicitly enabled;
- fetches the current STX price from CoinMarketCap with a 30-minute cache;
- classifies the transfer as `Mega Whale`, `Humpback Whale`, `Shark`, `Dolphin`, or `Fish`;
- generates a PNG alert image via `canvas`;
- publishes the message to X and Telegram;
- stores seen transactions, alert history, subscriptions, and wallet labels in a local data store;
- can fan out matching alerts to subscription-based webhook and Discord channels;
- removes the temporary image after sending.

Useful entry points:
- `index.js` — a long-running process for local execution;
- `api/check-transfers.js` — a serverless handler for running through Vercel Cron.

### 2. Serverless / Vercel flow
A cron job is configured in `vercel.json`:
- `GET /api/check-transfers`
- schedule: `0 10 * * *` (daily at 10:00 UTC)

This handler calls the same large-transfer checking logic as the local bot.

### 3. Dashboard
The `dashboard/` folder contains a separate React app built with Vite.

The dashboard:
- fetches recent token transfer transactions from the Hiro API;
- gets the current STX price from the Binance API;
- shows the latest 15 transactions;
- refreshes the feed approximately every 30 seconds;
- displays mock data for the 24h trend chart.

## Project structure

```text
.
├── api/
│   └── check-transfers.js
├── dashboard/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       └── main.jsx
├── lib/
│   └── image-generator.js
├── index.html
├── index.js
├── package.json
└── vercel.json
```

### What each part does
- `index.js` — the local bot that starts immediately and checks transactions every 10 minutes.
- `api/check-transfers.js` — the API endpoint for serverless execution.
- `lib/image-generator.js` — generates the PNG card for social media.
- `dashboard/src/App.jsx` — the main dashboard interface.
- `index.html` — a simple static HTML file in the root, not the React dashboard.
- `vercel.json` — the Vercel cron configuration.

## Requirements

- Node.js 18+
- npm
- internet access for:
  - Hiro API
  - CoinMarketCap API
  - X API
  - Telegram Bot API
  - Binance API (for the dashboard)

## Installation

### Root application
```bash
npm install
```

### Dashboard
```bash
cd dashboard
npm install
```

## Environment variables

Create a `.env` file in the project root:

```env
TWITTER_API_KEY=your_key
TWITTER_API_SECRET=your_secret
TWITTER_ACCESS_TOKEN=your_token
TWITTER_ACCESS_SECRET=your_secret
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
COINMARKETCAP_API_KEY=your_cmc_key
STX_WHALE_THRESHOLD=100000
ENABLE_LEGACY_BNS_LOOKUP=false
DATA_DIR=./data
KNOWN_WALLET_LABELS_JSON={"SP123":"Treasury"}
STRIPE_PAYMENT_LINK_PRO=https://buy.stripe.com/...
STRIPE_PAYMENT_LINK_TEAM=https://buy.stripe.com/...
```

### What they are used for
- `TWITTER_API_KEY`, `TWITTER_API_SECRET`, `TWITTER_ACCESS_TOKEN`, `TWITTER_ACCESS_SECRET` — publishing to X.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — sending messages to Telegram.
- `COINMARKETCAP_API_KEY` — fetching the STX price to calculate the USD equivalent.
- `STX_WHALE_THRESHOLD` — minimum STX transfer amount required to trigger an alert.
- `ENABLE_LEGACY_BNS_LOOKUP` — opt-in toggle for the old Hiro BNS lookup path. It is disabled by default because the endpoint currently returns `404`.
- `DATA_DIR` — storage location for local JSON persistence.
- `KNOWN_WALLET_LABELS_JSON` — optional JSON map of address-to-label overrides.
- `STRIPE_PAYMENT_LINK_PRO`, `STRIPE_PAYMENT_LINK_TEAM` — optional Stripe payment links exposed by the checkout API.

> If the Telegram variables are not set, Telegram delivery simply will not work. The Hiro API is used directly and currently does not require a separate environment variable.

## Commands

### In the project root
The following scripts are available from `package.json`:

```bash
npm start
```
Runs `node index.js` and starts the monitoring bot.

```bash
npm test
```
A placeholder command. It currently fails intentionally with `Error: no test specified`.

### In `dashboard/`

```bash
npm run dev
```
Starts the Vite dev server.

```bash
npm run build
```
Builds the production dashboard bundle.

```bash
npm run preview
```
Locally previews the production build.

```bash
npm run lint
```
Runs ESLint for the dashboard.

## Local run

### Running the bot
```bash
npm start
```

After startup, the bot:
- runs one check immediately;
- then repeats the check every 60 seconds via `setInterval`.

### Running the dashboard
```bash
cd dashboard
npm run dev
```

## External services and APIs

The project uses:
- **Hiro API** — fetching transactions and optional legacy BNS names;
- **CoinMarketCap API** — current STX price for alerts;
- **X API** via `twitter-api-v2` — publishing posts;
- **Telegram Bot API** — sending messages to Telegram;
- **Binance API** — STX price in the dashboard.

## Management APIs

- `GET /api/alerts` — list recent persisted alerts.
- `GET /api/health` — health and storage mode status.
- `GET|POST|PUT|DELETE /api/subscriptions` — manage alert subscriptions.
- `GET|POST|DELETE /api/wallet-labels` — manage local wallet labels.
- `GET /api/plans` — list plan catalog and limits.
- `GET /api/checkout-link?plan=pro` — expose configured Stripe payment links.

## Current implementation notes

- Whale transaction threshold for the bot is configurable via `STX_WHALE_THRESHOLD` and defaults to **100,000 STX**.
- `seenTx` is stored in memory, so duplicates are filtered only within the current process.
- The local data store persists seen transactions and alert history between local restarts.
- When `DATABASE_URL` is set, the app switches to Neon Postgres automatically and creates required tables/indexes on first use.
- Without `DATABASE_URL`, Vercel/serverless falls back to `/tmp`, which is writable but not durable.
- The demo image script writes output to the system temp directory instead of the repo root.
- In the dashboard, part of the statistics and the chart are currently filled with mock values.
- The root `index.html` is a separate simple HTML page, not the production entry point for the React dashboard.

## Quick code references

- Local bot: `index.js:1-190`
- Serverless endpoint: `api/check-transfers.js:1-184`
- Image generator: `lib/image-generator.js:1-94`
- Dashboard app: `dashboard/src/App.jsx:1-199`
- Dashboard entry: `dashboard/src/main.jsx:1-10`
- Root scripts: `package.json:1-20`
- Dashboard scripts: `dashboard/package.json:1-32`
- Vercel cron: `vercel.json:1-6`
