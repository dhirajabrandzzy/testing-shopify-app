import prisma from "../db.server";
import { fetchConnectStatus } from "../larapush.server";

export type ShopSettingsRecord = {
  shop: string;
  larapushPanelUrl: string | null;
  larapushApiKey: string | null;
  larapushDomainId: number | null;
  larapushDomainName: string | null;
  storefrontDomain: string | null;
  connectedAt: Date | null;
  enabled: boolean;
};

export async function getShopSettings(shop: string) {
  return prisma.shopSettings.findUnique({ where: { shop } });
}

export async function upsertShopSettings(
  shop: string,
  data: Partial<
    Omit<ShopSettingsRecord, "shop"> & {
      larapushPanelUrl?: string | null;
      larapushApiKey?: string | null;
    }
  >,
) {
  return prisma.shopSettings.upsert({
    where: { shop },
    create: {
      shop,
      ...data,
    },
    update: data,
  });
}

export async function deleteShopSettings(shop: string) {
  return prisma.shopSettings.deleteMany({ where: { shop } });
}

export function isShopConnected(settings: ShopSettingsRecord | null | undefined) {
  return Boolean(
    settings?.larapushApiKey &&
      settings?.larapushPanelUrl &&
      settings?.storefrontDomain &&
      settings?.enabled,
  );
}

export type PanelConnectionState = {
  connected: boolean;
  settings: ShopSettingsRecord | null;
  panelStatus: Record<string, unknown> | null;
  disabledByPanel: boolean;
};

export async function resolvePanelConnection(
  shop: string,
): Promise<PanelConnectionState> {
  const settings = await getShopSettings(shop);

  if (!isShopConnected(settings)) {
    return {
      connected: false,
      settings,
      panelStatus: null,
      disabledByPanel: Boolean(
        settings?.larapushApiKey &&
          settings?.larapushPanelUrl &&
          settings?.storefrontDomain &&
          settings?.enabled === false,
      ),
    };
  }

  const result = await fetchConnectStatus(settings!, shop);

  if (result.ok && result.data?.success) {
    return {
      connected: true,
      settings,
      panelStatus: result.data,
      disabledByPanel: false,
    };
  }

  if (result.status === 401 || result.status === 403) {
    const updated = await upsertShopSettings(shop, { enabled: false });
    return {
      connected: false,
      settings: updated,
      panelStatus: result.data,
      disabledByPanel: true,
    };
  }

  return {
    connected: true,
    settings,
    panelStatus: result.data,
    disabledByPanel: false,
  };
}

export async function markPanelConnectionDisabled(shop: string) {
  const settings = await getShopSettings(shop);
  if (!settings) {
    return null;
  }
  return upsertShopSettings(shop, { enabled: false });
}
