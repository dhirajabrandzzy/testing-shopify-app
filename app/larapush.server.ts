import type { ShopSettingsRecord } from "./models/shop-settings.server";

export type PanelCredentials = {
  larapushPanelUrl: string;
  larapushEmail: string;
  larapushPassword: string;
  larapushDomainName: string;
};

function panelBaseUrl(settings: ShopSettingsRecord) {
  const url = settings.larapushPanelUrl?.replace(/\/$/, "");
  if (!url) {
    throw new Error("LaraPush panel URL is not configured.");
  }
  return url;
}

function panelAuthBody(settings: ShopSettingsRecord) {
  return {
    email: settings.larapushEmail ?? "",
    password: settings.larapushPassword ?? "",
  };
}

async function panelPost(
  panelUrl: string,
  path: string,
  body: Record<string, unknown>,
) {
  const base = panelUrl.replace(/\/$/, "");
  const response = await fetch(`${base}/api/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  return { response, data };
}

export async function verifyPanelCredentials(credentials: PanelCredentials) {
  const { response, data } = await panelPost(
    credentials.larapushPanelUrl,
    "checkAuth",
    {
      email: credentials.larapushEmail,
      password: credentials.larapushPassword,
    },
  );

  if (!response.ok || data.success === false) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Invalid panel email or password.",
    );
  }

  return data;
}

export async function connectToPanel(params: {
  panelUrl: string;
  email: string;
  password: string;
  domainName: string;
}) {
  const credentials: PanelCredentials = {
    larapushPanelUrl: params.panelUrl.replace(/\/$/, ""),
    larapushEmail: params.email.trim(),
    larapushPassword: params.password,
    larapushDomainName: params.domainName.trim(),
  };

  await verifyPanelCredentials(credentials);

  const { response, data } = await panelPost(
    credentials.larapushPanelUrl,
    "shopifyIntegration",
    {
      email: credentials.larapushEmail,
      password: credentials.larapushPassword,
      domain: credentials.larapushDomainName,
    },
  );

  if (!response.ok || !data.success) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Could not load LaraPush domain configuration.",
    );
  }

  return {
    domain_id: data.domain_id as number,
    domain_name: data.domain_name as string,
  };
}

export async function fetchPanelAuthStatus(settings: ShopSettingsRecord) {
  const { response, data } = await panelPost(
    panelBaseUrl(settings),
    "checkAuth",
    panelAuthBody(settings),
  );
  return { ok: response.ok, status: response.status, data };
}

export async function fetchStorefrontConfig(settings: ShopSettingsRecord) {
  const { response, data } = await panelPost(
    panelBaseUrl(settings),
    "shopifyIntegration",
    {
      ...panelAuthBody(settings),
      domain: settings.larapushDomainName,
    },
  );

  if (!response.ok) {
    const error = new Error(
      typeof data?.message === "string"
        ? data.message
        : `Storefront config failed (${response.status})`,
    ) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  if (data?.options) {
    data.options.domain = "/apps/larapush/";
    data.options.serviceWorker = "/apps/larapush/firebase-messaging-sw.js";
    data.options.api_url = "/apps/larapush/token";
  }

  return data;
}

export function buildServiceWorkerFromConfig(config: any) {
  const options = config?.options ?? {};
  const firebaseConfig = options?.firebaseConfig ?? {};
  const domain = options?.domain ?? "/apps/larapush/";
  const apiUrl = options?.api_url ?? "/apps/larapush/token";
  const vapidPublicKey = options?.vapid_public_key ?? "";
  const oneTimeCollect = options?.one_time_collect ?? 1;

  return `const options = {
  firebaseConfig: {
    projectId: ${JSON.stringify(firebaseConfig?.projectId ?? "")},
    messagingSenderId: ${JSON.stringify(firebaseConfig?.messagingSenderId ?? "")},
    appId: ${JSON.stringify(firebaseConfig?.appId ?? "")},
    apiKey: ${JSON.stringify(firebaseConfig?.apiKey ?? "")},
  },
  domain: ${JSON.stringify(domain)},
  api_url: ${JSON.stringify(apiUrl)},
  vapid_public_key: ${JSON.stringify(vapidPublicKey)},
  http: 0,
  one_time_collect: ${Number(oneTimeCollect) === 1 ? 1 : 0},
};

importScripts("https://cdn.larapush.com/sw/larapush-sw-v5.min.js");
`;
}

export async function forwardTokenToPanel(
  settings: ShopSettingsRecord,
  body: Record<string, unknown>,
) {
  const tokenDomain =
    settings.larapushDomainName || settings.storefrontDomain || "";

  const payload = {
    ...body,
    domain: tokenDomain,
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
