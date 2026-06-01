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
  resolvePanelConnection,
  upsertShopSettings,
} from "../models/shop-settings.server";
import { connectToPanel, fetchShopPrimaryDomain } from "../larapush.server";
import { LaraPushBrandBar } from "../components/LaraPushBrandBar";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;
  const domains = await fetchShopPrimaryDomain(admin);
  const connection = await resolvePanelConnection(shop);

  return {
    shop,
    settings: connection.settings,
    connected: connection.connected,
    credentialsInvalid: connection.credentialsInvalid,
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
  const email = String(form.get("email") || "").trim();
  const password = String(form.get("password") || "");
  const domainName = String(form.get("domainName") || "").trim();

  if (!panelUrl || !email || !password || !domainName) {
    return {
      ok: false,
      message: "Panel URL, email, password, and domain name are required.",
    };
  }

  const domains = await fetchShopPrimaryDomain(admin);
  const storefrontDomain =
    domains.primaryDomain || domains.myshopifyDomain || shop;

  try {
    const result = await connectToPanel({
      panelUrl,
      email,
      password,
      domainName,
    });

    await upsertShopSettings(shop, {
      larapushPanelUrl: panelUrl.replace(/\/$/, ""),
      larapushEmail: email,
      larapushPassword: password,
      larapushDomainId: result.domain_id,
      larapushDomainName: result.domain_name,
      storefrontDomain,
      connectedAt: new Date(),
      enabled: true,
    });

    return {
      ok: true,
      message: `Connected to LaraPush domain "${result.domain_name}". Enable the theme app embed, then visit your storefront to subscribe.`,
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
    credentialsInvalid,
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
    <s-page heading="LaraPush settings" inlineSize="small">
      <s-section heading="Connection status">
        <LaraPushBrandBar subtitle="Connect your Shopify store to your self-hosted LaraPush panel." />

        <div className="lp-meta">
          <p>
            <strong>Shop:</strong> {shop}
          </p>
          <p>
            <strong>Panel URL:</strong> {settings?.larapushPanelUrl || "—"}
          </p>
          <p>
            <strong>Panel email:</strong> {settings?.larapushEmail || "—"}
          </p>
          <p>
            <strong>LaraPush domain:</strong>{" "}
            {settings?.larapushDomainName || "—"}
          </p>
          <p>
            <strong>Storefront domain:</strong>{" "}
            {settings?.storefrontDomain || primaryDomain || myshopifyDomain}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {connected ? (
              <span className="lp-status-connected">Connected</span>
            ) : (
              <span className="lp-status-disconnected">Not connected</span>
            )}
          </p>
        </div>

        {connected ? (
          <s-banner tone="success" heading="Connected to LaraPush">
            Your store is linked to panel at{" "}
            <strong>{settings?.larapushPanelUrl}</strong>. Subscribers sync to
            LaraPush domain {settings?.larapushDomainName}.
          </s-banner>
        ) : credentialsInvalid ? (
          <s-banner tone="warning" heading="Invalid panel credentials">
            The saved email or password no longer works. Enter your current
            panel login in the form below and save again.
          </s-banner>
        ) : (
          <s-banner tone="info" heading="How to connect">
            Use the same panel URL, email, and password as the WordPress plugin.
            The domain name must match this site in LaraPush (see Domains →
            Integration → Shopify in the panel).
          </s-banner>
        )}
      </s-section>

      <s-section heading="Panel credentials">
        <Form method="post" className="lp-form">
          <input type="hidden" name="intent" value="connect" />

          <div className="lp-field">
            <label htmlFor="panelUrl">LaraPush panel URL</label>
            <input
              id="panelUrl"
              name="panelUrl"
              type="url"
              required
              placeholder="https://panel.yourdomain.com"
              defaultValue={settings?.larapushPanelUrl || defaultPanelUrl}
            />
          </div>

          <div className="lp-field">
            <label htmlFor="email">Panel email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="Same as WordPress plugin"
              defaultValue={settings?.larapushEmail || ""}
            />
          </div>

          <div className="lp-field">
            <label htmlFor="password">Panel password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="Same as WordPress plugin"
            />
          </div>

          <div className="lp-field">
            <label htmlFor="domainName">LaraPush domain name</label>
            <input
              id="domainName"
              name="domainName"
              type="text"
              required
              placeholder="e.g. yourstore.com"
              defaultValue={settings?.larapushDomainName || ""}
            />
          </div>

          <s-button
            type="submit"
            variant="primary"
            {...(isSubmitting ? { loading: true } : {})}
          >
            {isSubmitting ? "Connecting..." : "Connect to LaraPush"}
          </s-button>
        </Form>
      </s-section>

      {connected ? (
        <s-section heading="Disconnect">
          <s-paragraph>
            Remove the link between this Shopify store and your LaraPush panel.
            Existing subscribers in LaraPush are not deleted.
          </s-paragraph>
          <Form method="post">
            <input type="hidden" name="intent" value="disconnect" />
            <s-button
              type="submit"
              variant="secondary"
              tone="critical"
              {...(isSubmitting ? { loading: true } : {})}
            >
              Disconnect
            </s-button>
          </Form>
        </s-section>
      ) : null}

      <s-section slot="aside" heading="Theme embed">
        <s-paragraph>
          After connecting, enable the <strong>LaraPush Subscribe</strong> app
          embed in Online Store → Themes → Customize → App embeds.
        </s-paragraph>
        <s-paragraph>
          The service worker and token API are served via app proxy at{" "}
          <code>/apps/larapush/</code>.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
