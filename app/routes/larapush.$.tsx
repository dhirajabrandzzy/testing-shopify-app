import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import {
  getShopSettings,
  isShopConnected,
  markPanelConnectionDisabled,
} from "../models/shop-settings.server";
import {
  buildServiceWorkerFromConfig,
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
  const url = new URL(request.url);
  const context = await authenticate.public.appProxy(request);
  const shop =
    url.searchParams.get("shop") ||
    context.session?.shop ||
    undefined;
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

function fallbackServiceWorker() {
  return `self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const path = proxyPath(request);
  let shop = "";
  let settings: Awaited<ReturnType<typeof getShopSettings>> | null = null;

  try {
    const context = await getProxyContext(request);
    shop = context.shop;
    settings = context.settings;
  } catch (error) {
    if (path === "config.json") {
      return Response.json(
        {
          success: false,
          message:
            error instanceof Response
              ? await error.text()
              : "LaraPush is not ready for this shop.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    if (path === "firebase-messaging-sw.js") {
      return new Response(fallbackServiceWorker(), {
        status: 200,
        headers: {
          "Content-Type": "application/javascript",
          "Cache-Control": "no-store",
          "Service-Worker-Allowed": "/",
        },
      });
    }
  }

  if (path === "firebase-messaging-sw.js") {
    let sw: string;
    try {
      const config = await fetchStorefrontConfig(settings!);
      sw = buildServiceWorkerFromConfig(config);
    } catch {
      sw = fallbackServiceWorker();
    }
    return new Response(sw, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=300",
        "Service-Worker-Allowed": "/",
      },
    });
  }

  if (path === "config.json") {
    try {
      const config = await fetchStorefrontConfig(settings!);
      return Response.json(config, {
        headers: { "Cache-Control": "public, max-age=120" },
      });
    } catch (error) {
      if (
        error instanceof Error &&
        (error as Error & { status?: number }).status === 401
      ) {
        await markPanelConnectionDisabled(shop);
      }

      return Response.json(
        {
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Could not load LaraPush configuration.",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  return new Response("", { status: 200 });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method !== "POST") {
    return Response.json({ success: false, message: "Method not allowed" });
  }

  let shop = "";
  let settings: Awaited<ReturnType<typeof getShopSettings>> | null = null;
  try {
    const context = await getProxyContext(request);
    shop = context.shop;
    settings = context.settings;
  } catch (error) {
    return Response.json({
      success: false,
      message:
        error instanceof Response
          ? await error.text()
          : "LaraPush is not connected for this shop.",
    });
  }
  const path = proxyPath(request);

  if (path !== "token") {
    return Response.json({ success: false, message: "Not found" });
  }

  const body = await request.json().catch(() => ({}));
  const result = await forwardTokenToPanel(settings!, body);

  return Response.json(result.data, { status: result.status || 200 });
};
