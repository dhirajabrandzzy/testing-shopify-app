import { useEffect } from "react";
import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  deleteShopSettings,
  getShopSettings,
  isShopConnected,
  upsertShopSettings,
} from "../models/shop-settings.server";
import {
  exchangeConnectionToken,
  fetchConnectStatus,
  fetchShopPrimaryDomain,
} from "../larapush.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const settings = await getShopSettings(shop);
  const domains = await fetchShopPrimaryDomain(admin);

  let panelStatus: Record<string, unknown> | null = null;
  if (settings && isShopConnected(settings)) {
    try {
      panelStatus = await fetchConnectStatus(settings, shop);
    } catch {
      panelStatus = { success: false, message: "Could not reach LaraPush panel." };
    }
  }

  return {
    shop,
    settings,
    connected: isShopConnected(settings),
    panelStatus,
    primaryDomain: domains.primaryDomain,
    myshopifyDomain: domains.myshopifyDomain,
    defaultPanelUrl: process.env.LARAPUSH_PANEL_URL || "",
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "disconnect") {
    await deleteShopSettings(shop);
    return { ok: true, message: "Disconnected from LaraPush panel." };
  }

  const panelUrl = String(form.get("panelUrl") || "").trim();
  const connectionToken = String(form.get("connectionToken") || "").trim();

  if (!panelUrl || !connectionToken) {
    return {
      ok: false,
      message: "Panel URL and connection token are required.",
    };
  }

  const domains = await fetchShopPrimaryDomain(admin);
  const storefrontDomain =
    domains.primaryDomain || domains.myshopifyDomain || shop;

  try {
    const appUrl = process.env.SHOPIFY_APP_URL || "";
    const result = await exchangeConnectionToken({
      panelUrl,
      connectionToken,
      shop,
      storefrontDomain,
      appUrl,
    });

    await upsertShopSettings(shop, {
      larapushPanelUrl: panelUrl.replace(/\/$/, ""),
      larapushApiKey: result.api_key,
      larapushDomainId: result.domain_id,
      larapushDomainName: result.domain_name,
      storefrontDomain: result.storefront_domain,
      connectedAt: new Date(),
      enabled: true,
    });

    return {
      ok: true,
      message: `Connected to LaraPush domain "${result.domain_name}" (${result.storefront_domain}). Enable the theme app embed, then visit your storefront to subscribe.`,
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "Connection failed.",
    };
  }
};

export default function SettingsPage() {
  const {
    shop,
    settings,
    connected,
    panelStatus,
    primaryDomain,
    myshopifyDomain,
    defaultPanelUrl,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const shopify = useAppBridge();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.message) {
      shopify.toast.show(actionData.message, {
        isError: actionData.ok === false,
      });
    }
  }, [actionData, shopify]);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 8 }}>LaraPush settings</h1>
      <p style={{ marginBottom: 16 }}>
        Connect this Shopify app to your LaraPush panel using panel URL + token.
      </p>

      <div style={{ marginBottom: 20 }}>
        <p>
          <strong>Shop:</strong> {shop}
        </p>
        <p>
          <strong>Storefront domain (for panel):</strong>{" "}
          {settings?.storefrontDomain || primaryDomain || myshopifyDomain}
        </p>
        <p>
          <strong>Status:</strong> {connected ? "Connected" : "Not connected"}
        </p>
        {connected && panelStatus?.success ? (
          <p>
            <strong>Panel domain:</strong> {String(panelStatus.domain_name)} (ID{" "}
            {String(panelStatus.domain_id)})
          </p>
        ) : null}
      </div>

      <Form method="post" style={{ display: "grid", gap: 10, marginBottom: 20 }}>
        <input type="hidden" name="intent" value="connect" />
        <label>
          LaraPush panel URL
          <input
            name="panelUrl"
            type="url"
            required
            placeholder="https://panel.yourdomain.com"
            defaultValue={settings?.larapushPanelUrl || defaultPanelUrl}
            style={{ width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
        <label>
          Connection token
          <input
            name="connectionToken"
            type="text"
            required
            placeholder="Paste token from panel"
            style={{ width: "100%", marginTop: 4, padding: 8 }}
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{ width: 240, padding: "10px 12px" }}
        >
          {isSubmitting ? "Connecting..." : "Connect to LaraPush"}
        </button>
      </Form>

      {connected ? (
        <Form method="post">
          <input type="hidden" name="intent" value="disconnect" />
          <button type="submit" disabled={isSubmitting} style={{ padding: "8px 12px" }}>
            Disconnect
          </button>
        </Form>
      ) : null}
    </main>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
