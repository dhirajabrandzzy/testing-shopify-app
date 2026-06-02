import { useEffect } from "react";
import type { HeadersFunction } from "react-router";
import {
  Form,
  useActionData,
  useLoaderData,
  useNavigation,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { LaraPushBrandBar } from "../components/LaraPushBrandBar";
import {
  dashboardAction,
  dashboardHeaders,
  dashboardLoader,
} from "./app.dashboard.server";

export const loader = dashboardLoader;
export const action = dashboardAction;
export const headers: HeadersFunction = dashboardHeaders;

export default function AppDashboard() {
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

  const storefrontDomain =
    settings?.storefrontDomain || primaryDomain || myshopifyDomain;

  return (
    <s-page heading="LaraPush" inlineSize="small">
      <LaraPushBrandBar subtitle="Connect this store to your self-hosted LaraPush panel." />

      <s-section heading="Connection status">
        <div className="lp-meta">
          <p>
            <strong>Shop:</strong> {shop}
          </p>
          <p>
            <strong>Storefront domain:</strong> {storefrontDomain || "—"}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {connected ? (
              <span className="lp-status-connected">Connected</span>
            ) : (
              <span className="lp-status-disconnected">Not connected</span>
            )}
          </p>
          {connected && settings?.larapushPanelUrl ? (
            <p>
              <strong>Panel:</strong> {settings.larapushPanelUrl}
            </p>
          ) : null}
          {connected && settings?.larapushDomainName ? (
            <p>
              <strong>LaraPush domain:</strong> {settings.larapushDomainName}
            </p>
          ) : null}
        </div>

        {connected ? (
          <s-banner tone="success" heading="Connected to LaraPush">
            Subscribers sync to LaraPush domain{" "}
            <strong>{settings?.larapushDomainName}</strong>. Enable the theme
            app embed below, then test on your storefront.
          </s-banner>
        ) : credentialsInvalid ? (
          <s-banner tone="warning" heading="Invalid panel credentials">
            Update your panel login below and connect again.
          </s-banner>
        ) : (
          <s-banner tone="info" heading="Get started">
            Enter your LaraPush panel URL, email, password, and domain name
            (same credentials as the WordPress plugin).
          </s-banner>
        )}
      </s-section>

      <s-section heading="Panel connection">
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
            <p className="lp-field-hint">
              Must match the domain in LaraPush panel → Domains → Integration →
              Shopify.
            </p>
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
            Remove the link between this store and your LaraPush panel.
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

      <s-section slot="aside" heading="Setup checklist">
        <s-unordered-list>
          <s-list-item>
            Connect your panel using the form (URL, email, password, domain
            name).
          </s-list-item>
          <s-list-item>
            <strong>Online Store → Themes → Customize → App embeds</strong> —
            enable <strong>LaraPush Subscribe</strong>.
          </s-list-item>
          <s-list-item>
            Visit your storefront and allow browser notifications.
          </s-list-item>
          <s-list-item>
            Confirm subscribers in LaraPush panel under your domain.
          </s-list-item>
        </s-unordered-list>
        <s-paragraph>
          Storefront endpoints (app proxy):{" "}
          <code>/apps/larapush/config.json</code>,{" "}
          <code>/apps/larapush/firebase-messaging-sw.js</code>,{" "}
          <code>POST /apps/larapush/token</code>
        </s-paragraph>
      </s-section>
    </s-page>
  );
}
