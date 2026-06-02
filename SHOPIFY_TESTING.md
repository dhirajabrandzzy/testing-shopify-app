# LaraPush + Shopify — testing guide

## Architecture

| Piece | Role |
|-------|------|
| **LaraPush panel** | Stores subscribers, sends notifications, popup text/colors |
| **Shopify app (this repo)** | OAuth, panel connection, app proxy (`/apps/larapush/*`) |
| **Theme app embed** | Loads LaraPush popup on the storefront |

Subscribers are **never** stored in the Shopify app database — only connection settings are.

## Prerequisites

1. LaraPush panel running (local or hosted) with a **Domain** created and enabled.
2. Domain name in the panel should match the hostname shoppers use (usually your store’s **primary domain**, e.g. `your-store.com`).
3. Shopify Partner app linked to this project (`shopify app config link` or `shopify.app.local.toml`).
4. For app proxy on the storefront you need a **public URL** (tunnel). `npm run dev:localhost` works for Admin only; use `npm run dev` (Cloudflare tunnel) for full storefront testing.

## Setup

### 1. Panel

```bash
cd Larapush-Panel
php artisan migrate
```

Open panel → **Domains** → your domain → **Shopify** button (or URL `/integration/shopify/{domain_id}`).

Copy the **domain name** shown (e.g. `your-store.com`). You will use the same panel **email** and **password** as the WordPress plugin.

### 2. Shopify app

```bash
cd selfhostedapp1
npm install
npx prisma migrate deploy
cp .env.example .env   # fill SHOPIFY_* and optional LARAPUSH_PANEL_URL
npm run dev            # prefer tunnel mode for proxy + theme embed
```

Install the app on your dev store when prompted.

### 3. Connect in Shopify Admin

1. Apps → your app → **LaraPush settings**
2. **Panel URL** — e.g. `https://panel.test` (no trailing slash)
3. **Panel email** and **password** (same as WordPress plugin)
4. **LaraPush domain name** — must match the domain in the panel from step 1
5. **Connect to LaraPush**

### 4. Enable theme embed

1. Online Store → Themes → **Customize**
2. **App embeds** (left sidebar)
3. Enable **LaraPush Subscribe**
4. Save

### 5. Deploy app config (proxy + extension)

```bash
shopify app deploy
```

Re-install the app if you changed app proxy subpath (Shopify caches proxy path per install).

## How the subscribe prompt appears

1. Visitor opens any page with the embed enabled (typically all pages).
2. The embed fetches `/apps/larapush/config.json` (app proxy → your app → panel API).
3. The browser’s **native** notification permission dialog is shown (no custom LaraPush overlay on Shopify).
4. If the visitor allows, the service worker at `/apps/larapush/firebase-messaging-sw.js` registers and the token is POSTed to `/apps/larapush/token` → panel `POST /api/token`.
5. If the visitor denies, the browser remembers — the prompt is not shown again on later pages.
6. Optional `popup_data.delay` (seconds) from the panel delays when the native prompt is requested.
7. Subscriber appears in panel under that **domain**.

## Verify subscriber

1. Open storefront in Chrome (desktop): `https://{your-storefront-domain}`
2. Allow the browser notification permission prompt
3. Panel → domain → subscribers — new token should appear

## Send a test push

From LaraPush panel, create/send a notification targeting that **domain** (same as WordPress). Delivery uses existing panel send pipeline (VAPID/FCM).

## Troubleshooting

| Issue | Check |
|-------|--------|
| No popup on storefront | App embed enabled? App connected? `config.json` in Network tab |
| `config.json` 503 | Connect app in Admin settings |
| `config.json` 404 | App proxy deployed? Use `npm run dev` with tunnel, not localhost-only |
| Subscriber not in panel | **LaraPush domain name** in app settings matches panel Domain `name`; check `/apps/larapush/token` response |
| SW 404 | Visit `/apps/larapush/firebase-messaging-sw.js` on store domain |
| Domain not found on token | Panel Domain name must equal storefront host (with/without `www` — be consistent) |

## API reference (panel)

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/checkAuth` | `email`, `password` | Verify panel login |
| `POST /api/shopifyIntegration` | `email`, `password`, `domain` | Popup + options JSON |
| `POST /api/token` | public | Subscriber ingest (used by proxy relay) |

## Local URLs

- App proxy on store: `https://{shop}/apps/larapush/config.json`
- SW: `https://{shop}/apps/larapush/firebase-messaging-sw.js`
- Token: `POST https://{shop}/apps/larapush/token`
