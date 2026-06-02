# Theme extension deploy (storefront prompt)

The **Admin UI** (connect panel) runs on your server (`npm run build` + PM2).

The **storefront subscribe script** lives in `extensions/larapush-subscribe/` and is uploaded to Shopify only via:

```bash
shopify app deploy
```

`npm run build` on the server does **not** install the theme app embed.

## Why the prompt does not show

| Symptom | Cause |
|---------|--------|
| No **LaraPush Subscribe** in Theme → App embeds | Extension not deployed to **this** Partner app |
| Embed list empty / wrong app | You deployed from another `client_id` (e.g. local `selfhostedapp1` vs production `larapush`) |
| Embed ON but no prompt | Open **live storefront** URL; check browser console for `[LaraPush]` |
| `config.json` returns 503/HTML | App not connected or app proxy URL wrong in Partner Dashboard |

## Deploy from your Mac (recommended)

1. In the project folder, link the **same** app as production:

```bash
cd selfhostedapp1
shopify app config link
```

Select the app whose Client ID matches server `.env` `SHOPIFY_API_KEY` (e.g. `23834f0428b685467c35567c5cd18068`).

2. Ensure `shopify.app.toml` on your machine uses that `client_id` and production URLs (or use a second config file).

3. Deploy:

```bash
npm run deploy
# or: shopify app deploy
```

4. In Shopify Admin: **Online Store → Themes → Customize → App embeds** → enable **LaraPush Subscribe** → **Save**.

5. Test: `https://YOUR-STORE/apps/larapush/config.json` → should be JSON `"success": true`.

## Deploy from the server (no global CLI)

```bash
cd /var/www/testing-shopify-app
npx shopify@latest auth login
npx shopify@latest app deploy
```

You must log in to the Partner account that owns the app. Headless servers may need a [CLI token](https://shopify.dev/docs/apps/tools/cli/ci-cd).

Installing CLI globally (optional):

```bash
npm install -g @shopify/cli @shopify/app
shopify version
shopify app deploy
```

## After deploy

- Extension version appears in Partner Dashboard → your app → **Extensions**.
- Each store must **enable** the embed on its **published** theme.
- Notification prompt is the **browser** dialog (Chrome may say Block, not Deny).
