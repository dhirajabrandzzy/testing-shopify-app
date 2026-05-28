import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { Link, useLoaderData } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import { getShopSettings, isShopConnected } from "../models/shop-settings.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const settings = await getShopSettings(session.shop);

  return {
    shop: session.shop,
    connected: isShopConnected(settings),
    storefrontDomain: settings?.storefrontDomain,
    domainName: settings?.larapushDomainName,
  };
};

export default function Index() {
  const { shop, connected, storefrontDomain, domainName } =
    useLoaderData<typeof loader>();

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: 20 }}>
      <h1 style={{ marginBottom: 12 }}>LaraPush for Shopify</h1>
      <p style={{ marginBottom: 16 }}>
        Self-hosted bridge between your Shopify store and LaraPush panel.
        Subscribers and push campaigns stay in LaraPush.
      </p>
      <p>
        <strong>Shop:</strong> {shop}
      </p>
      <p style={{ marginBottom: 16 }}>
        <strong>Connection:</strong>{" "}
        {connected
          ? `Connected (${domainName} → ${storefrontDomain})`
          : "Not connected"}
      </p>
      <Link
        to="/app/settings"
        style={{
          display: "inline-block",
          padding: "10px 14px",
          border: "1px solid #0f62fe",
          borderRadius: 8,
          textDecoration: "none",
        }}
      >
        {connected ? "Manage settings" : "Connect LaraPush panel"}
      </Link>
    </main>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
