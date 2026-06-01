import prisma from "../db.server";
import { fetchPanelAuthStatus } from "../larapush.server";

export type ShopSettingsRecord = {
  shop: string;
  larapushPanelUrl: string | null;
  larapushEmail: string | null;
  larapushPassword: string | null;
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
      larapushEmail?: string | null;
      larapushPassword?: string | null;
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
    settings?.larapushPanelUrl &&
      settings?.larapushEmail &&
      settings?.larapushPassword &&
      settings?.larapushDomainName &&
      settings?.storefrontDomain &&
      settings?.enabled,
  );
}

export type PanelConnectionState = {
  connected: boolean;
  settings: ShopSettingsRecord | null;
  panelStatus: Record<string, unknown> | null;
  credentialsInvalid: boolean;
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
      credentialsInvalid: Boolean(
        settings?.larapushPanelUrl &&
          settings?.larapushEmail &&
          settings?.larapushPassword &&
          settings?.larapushDomainName &&
          settings?.enabled === false,
      ),
    };
  }

  const result = await fetchPanelAuthStatus(settings!);

  if (result.ok && result.data?.success !== false) {
    return {
      connected: true,
      settings,
      panelStatus: result.data,
      credentialsInvalid: false,
    };
  }

  if (result.status === 401) {
    const updated = await upsertShopSettings(shop, { enabled: false });
    return {
      connected: false,
      settings: updated,
      panelStatus: result.data,
      credentialsInvalid: true,
    };
  }

  return {
    connected: true,
    settings,
    panelStatus: result.data,
    credentialsInvalid: false,
  };
}

export async function markPanelConnectionDisabled(shop: string) {
  const settings = await getShopSettings(shop);
  if (!settings) {
    return null;
  }
  return upsertShopSettings(shop, { enabled: false });
}
