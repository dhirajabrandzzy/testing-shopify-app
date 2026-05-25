import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
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
    <s-page heading="LaraPush for Shopify">
      <s-section heading="Overview">
        <s-paragraph>
          Self-hosted bridge between your Shopify store and LaraPush panel.
          Subscribers and push campaigns stay in LaraPush — this app handles
          OAuth, connection, and storefront subscription only.
        </s-paragraph>
        <s-stack direction="block" gap="base">
          <s-text>
            <strong>Shop:</strong> {shop}
          </s-text>
          <s-text>
            <strong>Connection:</strong>{" "}
            {connected
              ? `Connected (${domainName} → ${storefrontDomain})`
              : "Not connected"}
          </s-text>
        </s-stack>
        <s-link href="/app/settings">
          <s-button variant="primary">
            {connected ? "Manage settings" : "Connect LaraPush panel"}
          </s-button>
        </s-link>
      </s-section>

      {connected ? (
        <s-section heading="Next steps">
          <s-unordered-list>
            <s-list-item>
              Enable the <strong>LaraPush Subscribe</strong> app embed in your
              theme
            </s-list-item>
            <s-list-item>
              Visit your storefront and subscribe as a test visitor
            </s-list-item>
            <s-list-item>
              Send a test notification from LaraPush panel for domain{" "}
              {domainName}
            </s-list-item>
          </s-unordered-list>
        </s-section>
      ) : null}
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
