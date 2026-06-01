import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { resolvePanelConnection } from "../models/shop-settings.server";
import { LaraPushBrandBar } from "../components/LaraPushBrandBar";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const connection = await resolvePanelConnection(session.shop);

  return {
    shop: session.shop,
    connected: connection.connected,
    disabledByPanel: connection.disabledByPanel,
    panelUrl: connection.settings?.larapushPanelUrl,
    storefrontDomain: connection.settings?.storefrontDomain,
    larapushDomainName: connection.settings?.larapushDomainName,
  };
};

export default function Index() {
  const {
    shop,
    connected,
    disabledByPanel,
    panelUrl,
    storefrontDomain,
    larapushDomainName,
  } = useLoaderData<typeof loader>();

  return (
    <s-page heading="LaraPush for Shopify">
      <s-button
        slot="primary-action"
        variant="primary"
        href="/app/settings"
      >
        {connected ? "Manage settings" : "Connect panel"}
      </s-button>

      <s-section heading="Overview">
        <LaraPushBrandBar subtitle="Self-hosted bridge between your store and LaraPush panel." />

        <s-paragraph>
          Subscribers and push campaigns stay in your LaraPush panel. This app
          connects your Shopify storefront to LaraPush and serves the subscribe
          widget via the theme app embed.
        </s-paragraph>
      </s-section>

      <s-section heading="Store">
        <div className="lp-meta">
          <p>
            <strong>Shop:</strong> {shop}
          </p>
          <p>
            <strong>Connection:</strong>{" "}
            {connected ? (
              <span className="lp-status-connected">
                Connected to {panelUrl}
              </span>
            ) : (
              <span className="lp-status-disconnected">Not connected</span>
            )}
          </p>
          {connected && larapushDomainName ? (
            <p>
              <strong>LaraPush domain:</strong> {larapushDomainName}
            </p>
          ) : null}
          {connected && storefrontDomain ? (
            <p>
              <strong>Storefront domain:</strong> {storefrontDomain}
            </p>
          ) : null}
        </div>

        {connected ? (
          <s-banner tone="success" heading="Panel connected">
            Your store is linked to LaraPush panel at{" "}
            <strong>{panelUrl}</strong>. Enable the LaraPush Subscribe theme
            app embed, then visit your storefront to test subscriptions.
          </s-banner>
        ) : disabledByPanel ? (
          <s-banner tone="warning" heading="Disabled from LaraPush panel">
            This connection was disabled in your LaraPush panel. Generate a new
            connection token in Domains → Integration → Shopify, then reconnect
            in Settings.
          </s-banner>
        ) : (
          <s-banner tone="warning" heading="Connect your panel">
            Generate a connection token in your LaraPush panel under Domains →
            Integration → Shopify, then paste it in Settings.
          </s-banner>
        )}
      </s-section>

      <s-section slot="aside" heading="Quick steps">
        <s-unordered-list>
          <s-list-item>Install and open this app in Shopify Admin</s-list-item>
          <s-list-item>
            Go to <strong>Settings</strong> and connect your LaraPush panel
          </s-list-item>
          <s-list-item>
            Enable the <strong>LaraPush Subscribe</strong> theme app embed
          </s-list-item>
          <s-list-item>
            Visit your storefront to subscribe — subscribers appear in LaraPush
          </s-list-item>
        </s-unordered-list>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
