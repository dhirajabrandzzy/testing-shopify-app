import prisma from "../db.server";

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
      settings?.storefrontDomain,
  );
}
