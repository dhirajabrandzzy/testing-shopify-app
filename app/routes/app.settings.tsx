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
    <s-page heading="LaraPush settings">
      <s-section heading="Connection">
        <s-paragraph>
          Subscribers are stored in your LaraPush panel. Notifications are sent
          from the panel. This app only connects Shopify to LaraPush and serves
          the subscription script on your storefront.
        </s-paragraph>

        <s-stack direction="block" gap="base">
          <s-text>
            <strong>Shop:</strong> {shop}
          </s-text>
          <s-text>
            <strong>Storefront domain (for panel):</strong>{" "}
            {settings?.storefrontDomain || primaryDomain || myshopifyDomain}
          </s-text>
          <s-text>
            <strong>Status:</strong>{" "}
            {connected ? "Connected" : "Not connected"}
          </s-text>
          {connected && panelStatus?.success ? (
            <s-text>
              Panel domain: {String(panelStatus.domain_name)} (ID{" "}
              {String(panelStatus.domain_id)})
            </s-text>
          ) : null}
        </s-stack>
      </s-section>

      <s-section heading="Connect panel">
        <Form method="post">
          <input type="hidden" name="intent" value="connect" />
          <s-stack direction="block" gap="base">
            <label>
              <s-text>LaraPush panel URL</s-text>
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
              <s-text>Connection token</s-text>
              <input
                name="connectionToken"
                type="text"
                required
                placeholder="Paste token from panel → Domain → Shopify"
                style={{ width: "100%", marginTop: 4, padding: 8 }}
              />
            </label>
            <s-button
              type="submit"
              variant="primary"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Connect to LaraPush
            </s-button>
          </s-stack>
        </Form>
        <s-paragraph>
          In LaraPush panel, open{" "}
          <strong>Integration → Shopify</strong> for your domain and generate a
          connection token (valid 30 minutes).
        </s-paragraph>
      </s-section>

      {connected ? (
        <s-section heading="Theme embed (required for subscribe prompt)">
          <s-ordered-list>
            <s-list-item>
              Shopify Admin → Online Store → Themes → Customize
            </s-list-item>
            <s-list-item>
              App embeds → enable <strong>LaraPush Subscribe</strong>
            </s-list-item>
            <s-list-item>
              Save, then open your storefront in Chrome and allow notifications
            </s-list-item>
          </s-ordered-list>
          <Form method="post" style={{ marginTop: 16 }}>
            <input type="hidden" name="intent" value="disconnect" />
            <s-button
              type="submit"
              variant="tertiary"
              tone="critical"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Disconnect
            </s-button>
          </Form>
        </s-section>
      ) : null}

      <s-section slot="aside" heading="How the prompt appears">
        <s-paragraph>
          LaraPush uses the same popup script as WordPress (
          <code>larapush-popup</code> from CDN). After you enable the theme
          embed, visitors see your custom heading/subheading with Allow and Deny
          buttons (configured in the panel under domain popup settings). When they
          click Allow, the browser shows the native notification permission
          dialog, then the subscription is saved in LaraPush.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
