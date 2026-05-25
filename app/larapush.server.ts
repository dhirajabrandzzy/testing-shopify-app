import type { ShopSettingsRecord } from "./models/shop-settings.server";

function panelBaseUrl(settings: ShopSettingsRecord) {
  const url = settings.larapushPanelUrl?.replace(/\/$/, "");
  if (!url) {
    throw new Error("LaraPush panel URL is not configured.");
  }
  return url;
}

function shopifyHeaders(settings: ShopSettingsRecord, shop: string) {
  return {
    Authorization: `Bearer ${settings.larapushApiKey}`,
    "X-Shop": shop,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
}

export async function exchangeConnectionToken(params: {
  panelUrl: string;
  connectionToken: string;
  shop: string;
  storefrontDomain: string;
  appUrl?: string;
}) {
  const base = params.panelUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/api/shopify/v1/connect/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      connection_token: params.connectionToken,
      shop: params.shop,
      storefront_domain: params.storefrontDomain,
      app_url: params.appUrl,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.message || "Failed to connect to LaraPush panel.");
  }

  return data as {
    success: boolean;
    api_key: string;
    domain_id: number;
    domain_name: string;
    storefront_domain: string;
    shop_domain: string;
  };
}

export async function fetchConnectStatus(
  settings: ShopSettingsRecord,
  shop: string,
) {
  const response = await fetch(
    `${panelBaseUrl(settings)}/api/shopify/v1/connect/status`,
    { headers: shopifyHeaders(settings, shop) },
  );
  return response.json();
}

export async function fetchStorefrontConfig(
  settings: ShopSettingsRecord,
  shop: string,
) {
  const response = await fetch(
    `${panelBaseUrl(settings)}/api/shopify/v1/storefront-config`,
    { headers: shopifyHeaders(settings, shop) },
  );

  if (!response.ok) {
    throw new Error(`Storefront config failed (${response.status})`);
  }

  return response.json();
}

export async function fetchServiceWorker(
  settings: ShopSettingsRecord,
  shop: string,
) {
  const response = await fetch(
    `${panelBaseUrl(settings)}/api/shopify/v1/service-worker`,
    { headers: shopifyHeaders(settings, shop) },
  );

  if (!response.ok) {
    throw new Error(`Service worker failed (${response.status})`);
  }

  return response.text();
}

export async function forwardTokenToPanel(
  settings: ShopSettingsRecord,
  shop: string,
  body: Record<string, unknown>,
) {
  const payload = {
    ...body,
    domain: settings.storefrontDomain,
  };

  const response = await fetch(`${panelBaseUrl(settings)}/api/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function fetchShopPrimaryDomain(admin: {
  graphql: (
    query: string,
    options?: { variables?: Record<string, unknown> },
  ) => Promise<Response>;
}) {
  const response = await admin.graphql(
    `#graphql
      query ShopPrimaryDomain {
        shop {
          primaryDomain {
            host
          }
          myshopifyDomain
        }
      }`,
  );
  const json = await response.json();
  const shop = json.data?.shop;
  return {
    primaryDomain: shop?.primaryDomain?.host as string | undefined,
    myshopifyDomain: shop?.myshopifyDomain as string | undefined,
  };
}
