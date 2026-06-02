import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate } from "../shopify.server";
import {
  deleteShopSettings,
  resolvePanelConnection,
  upsertShopSettings,
} from "../models/shop-settings.server";
import { connectToPanel, fetchShopPrimaryDomain } from "../larapush.server";

export const dashboardLoader = async ({ request }: LoaderFunctionArgs) => {
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

export const dashboardAction = async ({ request }: ActionFunctionArgs) => {
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

export const dashboardHeaders = boundary.headers;
