-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NutritionBasis') THEN
    CREATE TYPE "NutritionBasis" AS ENUM (
      'POR_100_GRAMOS',
      'POR_100_MILILITROS',
      'POR_PORCION',
      'POR_UNIDAD'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NutritionSource') THEN
    CREATE TYPE "NutritionSource" AS ENUM (
      'MANUAL',
      'USDA',
      'FATSECRET',
      'OPENFOODFACTS',
      'ETIQUETA',
      'OTRO'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SupplyItemStatus') THEN
    CREATE TYPE "SupplyItemStatus" AS ENUM (
      'BORRADOR',
      'ACTIVO',
      'ARCHIVADO'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NutritionLookupOutcome') THEN
    CREATE TYPE "NutritionLookupOutcome" AS ENUM (
      'MATCH',
      'SIN_RESULTADOS',
      'ERROR'
    );
  END IF;
END
$$;

-- AlterTable SupplyItem
ALTER TABLE "SupplyItem"
  ADD COLUMN IF NOT EXISTS "normalizedName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "barcode" TEXT,
  ADD COLUMN IF NOT EXISTS "defaultServingSize" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "defaultServingUnit" "MeasurementUnit",
  ADD COLUMN IF NOT EXISTS "nutritionBasis" "NutritionBasis",
  ADD COLUMN IF NOT EXISTS "calorias" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "proteina" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "carbohidratos" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "grasas" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "fibra" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "azucar" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "sodio" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "densidad" DECIMAL(10,4),
  ADD COLUMN IF NOT EXISTS "ediblePortionFactor" DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS "source" "NutritionSource",
  ADD COLUMN IF NOT EXISTS "sourceExternalId" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceQuery" TEXT,
  ADD COLUMN IF NOT EXISTS "sourceConfidence" DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS "sourceSnapshot" JSONB,
  ADD COLUMN IF NOT EXISTS "lastSyncedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "manualOverride" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "needsReview" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "reviewNotes" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "status" "SupplyItemStatus" NOT NULL DEFAULT 'BORRADOR';

-- AlterTable Recipe
ALTER TABLE "Recipe"
  ADD COLUMN IF NOT EXISTS "calorias" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "proteina" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "carbohidratos" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "grasas" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "fibra" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "azucar" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "sodio" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "costoEstimado" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "pesoTotalGramos" DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS "nutritionCalculatedAt" TIMESTAMP(3);

-- AlterTable RecipeIngredient
ALTER TABLE "RecipeIngredient"
  ADD COLUMN IF NOT EXISTS "quantityInBaseUnit" DECIMAL(12,4),
  ADD COLUMN IF NOT EXISTS "wasteFactor" DECIMAL(5,4),
  ADD COLUMN IF NOT EXISTS "notasInternas" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE IF NOT EXISTS "SupplyNutritionLookupLog" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "supplyItemId" TEXT,
  "source" "NutritionSource" NOT NULL,
  "sourceExternalId" TEXT,
  "query" TEXT NOT NULL,
  "normalizedQuery" TEXT NOT NULL,
  "confidence" DECIMAL(5,4),
  "outcome" "NutritionLookupOutcome" NOT NULL,
  "requestSnapshot" JSONB,
  "responseSnapshot" JSONB,
  "selectedSnapshot" JSONB,
  "errorMessage" TEXT,
  "accepted" BOOLEAN,

  CONSTRAINT "SupplyNutritionLookupLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "SupplyItem_barcode_key" ON "SupplyItem"("barcode");
CREATE INDEX IF NOT EXISTS "SupplyItem_normalizedName_idx" ON "SupplyItem"("normalizedName");
CREATE INDEX IF NOT EXISTS "SupplyItem_status_needsReview_idx" ON "SupplyItem"("status", "needsReview");
CREATE INDEX IF NOT EXISTS "SupplyItem_source_sourceExternalId_idx" ON "SupplyItem"("source", "sourceExternalId");
CREATE INDEX IF NOT EXISTS "SupplyItem_lastSyncedAt_idx" ON "SupplyItem"("lastSyncedAt");
CREATE INDEX IF NOT EXISTS "Recipe_nutritionCalculatedAt_idx" ON "Recipe"("nutritionCalculatedAt");
CREATE INDEX IF NOT EXISTS "SupplyNutritionLookupLog_supplyItemId_createdAt_idx" ON "SupplyNutritionLookupLog"("supplyItemId", "createdAt");
CREATE INDEX IF NOT EXISTS "SupplyNutritionLookupLog_source_normalizedQuery_idx" ON "SupplyNutritionLookupLog"("source", "normalizedQuery");
CREATE INDEX IF NOT EXISTS "SupplyNutritionLookupLog_outcome_createdAt_idx" ON "SupplyNutritionLookupLog"("outcome", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SupplyNutritionLookupLog_supplyItemId_fkey'
  ) THEN
    ALTER TABLE "SupplyNutritionLookupLog"
      ADD CONSTRAINT "SupplyNutritionLookupLog_supplyItemId_fkey"
      FOREIGN KEY ("supplyItemId") REFERENCES "SupplyItem"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;
