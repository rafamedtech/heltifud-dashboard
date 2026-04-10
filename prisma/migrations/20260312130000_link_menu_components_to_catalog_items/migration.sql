ALTER TABLE "FoodComponent"
ADD COLUMN "catalogItemId" TEXT;

CREATE INDEX "FoodComponent_catalogItemId_idx" ON "FoodComponent"("catalogItemId");

ALTER TABLE "FoodComponent"
ADD CONSTRAINT "FoodComponent_catalogItemId_fkey"
FOREIGN KEY ("catalogItemId") REFERENCES "FoodCatalogItem"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
