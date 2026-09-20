# INE Price Tracker

A full-stack app that lets you search INE's mock storefront, track a product, and watch its
price and stock over time via a scheduled scraper that fights through a real anti-bot
challenge on every reveal.

- Live app: https://pricetrackerfe.vercel.app
- Live API: https://pricetracker-cou7.onrender.com

## Stack

- Frontend: React (Vite), deployed on Vercel
- Backend: Node/Express, deployed on Render (Docker)
- Database: Supabase (Postgres)
- Scraping: Playwright (Chromium) for the price reveal flow, plain axios for the product
  catalog
- Scheduling: cron-job.org, hitting the backend every 2 hours

## Repo layout

```
server/
  index.js              Express entry point
  config.js              env var loading
  Dockerfile              Playwright-ready build for Render
  db/
    schema.sql            Supabase table definitions
    supabaseClient.js
  routes/
    products.js           search / track / history / logs
    scrape.js              cron-triggered scrape endpoint
  scraper/
    fetchCatalog.js        catalog pagination + retry
    scrapeProduct.js        the core Playwright scraper
    headedRun.js            standalone headed-mode script (for the recording)
    testCatalog.js
    testScrape.js

client/
  src/
    App.jsx
    api/client.js
    pages/                Search, Dashboard, ProductDetail
    components/            PriceChart, ScrapeLogTable
```

## Environment variables

Server (`server/.env`, not committed):

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (bypasses RLS, backend-only) |
| `CRON_SECRET` | Shared secret the cron trigger must send as an `x-cron-secret` header |
| `PORT` | Optional, Render sets this automatically |

Client (set in Vercel project settings, or `client/.env` locally):

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the deployed backend |

## Local setup

1. Create a Supabase project and run `server/db/schema.sql` in its SQL editor.
2. In `server/`, create a `.env` with the three variables above, then:
   ```
   npm install
   npx playwright install chromium
   npm start
   ```
   Server runs on `http://localhost:4000`.
3. In `client/`, create a `.env` with `VITE_API_URL=http://localhost:4000`, then:
   ```
   npm install
   npm run dev
   ```
4. Manually add a product to track (or use the Search page once the frontend is running):
   ```sql
   insert into products (store_product_id, name, slug, brand, category, sku)
   values (822, 'Amperage Sleep Tracker XL', 'amperage-sleep-tracker-xl', 'Amperage', 'Wearables', 'AMP-10822');
   ```
5. Trigger a scrape manually to test:
   ```
   curl -X POST http://localhost:4000/api/scrape/run -H "x-cron-secret: <your CRON_SECRET>"
   ```

## Useful scripts (run from `server/`)

- `npm run test:catalog` — fetches the full 1000-product catalog, tests search
- `npm run test:scrape <productId>` — runs the scraper against one product in a visible
  browser window, with step-by-step logging
- `npm run headed` — runs the scraper against five known test products in headed mode;
  this is the script used for the required screen recording

## Scraping schedule

The backend exposes `POST /api/scrape/run`, guarded by an `x-cron-secret` header check.
cron-job.org calls this endpoint every 2 hours. On each run, the server loops over every
row in the `products` table, scrapes it with a fresh Playwright browser context, waits
1.5-3 seconds (randomized) between products, and writes:

- a `scrape_log` row on every single attempt, success or failure, with an honest status
  (`success` / `retried` / `failed`), attempt count, duration, and error reason
- a `price_history` row only when the scrape actually succeeded and both price and stock
  were confidently extracted

Render's free tier spins the backend down after inactivity, which is exactly why
scheduling goes through an external cron hitting a real endpoint rather than an
always-on interval loop inside the process.

## Deployment notes

- The backend must be deployed as a Docker service on Render (not the native Node
  runtime) — see the design note for why.
- CORS on the backend is currently open to all origins for development convenience; for
  a production submission this should be restricted to the Vercel domain.
