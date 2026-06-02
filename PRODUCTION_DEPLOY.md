# Production deploy checklist

If Shopify Admin shows the **default template** (“Congrats on creating a new Shopify app”, product GraphQL demo), the server is running an **old build**. This repo’s `/app` route is the LaraPush dashboard.

## Fix `shopify.app.toml` on the server

`application_url` must be the **app root**, not `/app`:

```toml
application_url = "https://shopify-app.larapu.sh"
```

Not `https://shopify-app.larapu.sh/app` — that breaks embedded routing.

Match `[auth]` redirect URLs and `[app_proxy]` URL to the same host.

## Deploy latest code on the server

```bash
cd /var/www/testing-shopify-app   # your path
git pull                         # or upload latest files
npm ci
npx prisma migrate deploy
npm run build
pm2 restart larapush-shopify --update-env
```

Verify `.env`:

```env
SHOPIFY_API_KEY=<Partner app Client ID>
SHOPIFY_API_SECRET=<Partner app secret>
SHOPIFY_APP_URL=https://shopify-app.larapu.sh
SCOPES=write_app_proxy
NODE_ENV=production
PORT=3000
```

`SHOPIFY_APP_URL` must match `application_url` (no trailing slash).

## Partner Dashboard

1. **App URL** = `https://shopify-app.larapu.sh`
2. **Allowed redirection URL(s)** = same three callback paths as `shopify.app.toml` `[auth]`
3. Run locally (or on CI) once after URL changes:

```bash
shopify app deploy
```

This pushes app proxy + theme extension to the Partner app.

## After deploy

1. Open the app in Shopify Admin — you should see **LaraPush** with panel URL, email, password, domain fields.
2. Hard refresh Admin (Cmd+Shift+R) if you still see the old template.
3. Connect panel → enable **LaraPush Subscribe** theme embed → test storefront.

## Still seeing the template?

- Confirm `build/server` / `build/client` timestamps are new after `npm run build`.
- `pm2` must run `npm run start` (or `react-router-serve`) from the project root, not an old copy.
- Uninstall and reinstall the app on the dev store if OAuth cached an old app version.
