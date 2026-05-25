import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  getShopSettings,
  isShopConnected,
} from "../models/shop-settings.server";
import {
  fetchServiceWorker,
  fetchStorefrontConfig,
  forwardTokenToPanel,
} from "../larapush.server";

function proxyPath(request: Request) {
  const url = new URL(request.url);
  const segments = url.pathname.split("/").filter(Boolean);
  const larapushIndex = segments.indexOf("larapush");
  if (larapushIndex === -1) {
    return "";
  }
  return segments.slice(larapushIndex + 1).join("/");
}

async function getProxyContext(request: Request) {
  const context = await authenticate.public.appProxy(request);
  const url = new URL(request.url);
  const shop =
    context.session?.shop || url.searchParams.get("shop") || undefined;
  if (!shop) {
    throw new Response("Shop not found", { status: 401 });
  }

  const settings = await getShopSettings(shop);
  if (!settings || !isShopConnected(settings)) {
    throw new Response("LaraPush is not connected for this shop.", {
      status: 503,
    });
  }

  return { shop, settings };
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { shop, settings } = await getProxyContext(request);
  const path = proxyPath(request);

  if (path === "firebase-messaging-sw.js") {
    const sw = await fetchServiceWorker(settings, shop);
    return new Response(sw, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  if (path === "config.json") {
    const config = await fetchStorefrontConfig(settings, shop);
    return Response.json(config, {
      headers: { "Cache-Control": "public, max-age=120" },
    });
  }

  return new Response("Not found", { status: 404 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const { shop, settings } = await getProxyContext(request);
  const path = proxyPath(request);

  if (path !== "token") {
    return new Response("Not found", { status: 404 });
  }

  const body = await request.json();
  const result = await forwardTokenToPanel(settings, shop, body);

  return Response.json(result.data, { status: result.status });
};
