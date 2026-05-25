-- CreateTable
CREATE TABLE "ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "larapushPanelUrl" TEXT,
    "larapushApiKey" TEXT,
    "larapushDomainId" INTEGER,
    "larapushDomainName" TEXT,
    "storefrontDomain" TEXT,
    "connectedAt" DATETIME,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
