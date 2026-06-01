-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ShopSettings" (
    "shop" TEXT NOT NULL PRIMARY KEY,
    "larapushPanelUrl" TEXT,
    "larapushEmail" TEXT,
    "larapushPassword" TEXT,
    "larapushDomainId" INTEGER,
    "larapushDomainName" TEXT,
    "storefrontDomain" TEXT,
    "connectedAt" DATETIME,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ShopSettings" (
    "shop",
    "larapushPanelUrl",
    "larapushEmail",
    "larapushPassword",
    "larapushDomainId",
    "larapushDomainName",
    "storefrontDomain",
    "connectedAt",
    "enabled",
    "createdAt",
    "updatedAt"
)
SELECT
    "shop",
    "larapushPanelUrl",
    NULL,
    NULL,
    "larapushDomainId",
    "larapushDomainName",
    "storefrontDomain",
    "connectedAt",
    "enabled",
    "createdAt",
    "updatedAt"
FROM "ShopSettings";
DROP TABLE "ShopSettings";
ALTER TABLE "new_ShopSettings" RENAME TO "ShopSettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
