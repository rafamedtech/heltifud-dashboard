-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('BORRADOR', 'ACTIVA', 'ARCHIVADA');

-- CreateEnum
CREATE TYPE "MeasurementUnit" AS ENUM (
  'GRAMO',
  'KILOGRAMO',
  'MILILITRO',
  'LITRO',
  'PIEZA',
  'TAZA',
  'CUCHARADA',
  'CUCHARADITA',
  'ONZA',
  'LIBRA',
  'PAQUETE',
  'LATA',
  'BOTELLA',
  'PORCION'
);

-- CreateTable
CREATE TABLE "SupplyCategory" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SupplyCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyItem" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "codigo" TEXT,
    "unidadBase" "MeasurementUnit" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "costoReferencial" DECIMAL(10,2),
    "mermaPorcentaje" DECIMAL(5,2),
    "categoryId" TEXT,

    CONSTRAINT "SupplyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "foodCatalogItemId" TEXT NOT NULL,
    "status" "RecipeStatus" NOT NULL DEFAULT 'BORRADOR',
    "version" INTEGER NOT NULL DEFAULT 1,
    "porciones" INTEGER,
    "rendimientoCantidad" DECIMAL(10,2),
    "rendimientoUnidad" "MeasurementUnit",
    "tiempoPreparacionMin" INTEGER,
    "tiempoCoccionMin" INTEGER,
    "instrucciones" TEXT NOT NULL DEFAULT '',
    "notas" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "recipeId" TEXT NOT NULL,
    "supplyItemId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "grupo" TEXT,
    "cantidad" DECIMAL(10,2) NOT NULL,
    "unidad" "MeasurementUnit" NOT NULL,
    "notas" TEXT NOT NULL DEFAULT '',
    "opcional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplyCategory_slug_key" ON "SupplyCategory"("slug");

-- CreateIndex
CREATE INDEX "SupplyCategory_isActive_sortOrder_idx" ON "SupplyCategory"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "SupplyCategory_nombre_idx" ON "SupplyCategory"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "SupplyItem_codigo_key" ON "SupplyItem"("codigo");

-- CreateIndex
CREATE INDEX "SupplyItem_nombre_idx" ON "SupplyItem"("nombre");

-- CreateIndex
CREATE INDEX "SupplyItem_isActive_idx" ON "SupplyItem"("isActive");

-- CreateIndex
CREATE INDEX "SupplyItem_categoryId_nombre_idx" ON "SupplyItem"("categoryId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_foodCatalogItemId_key" ON "Recipe"("foodCatalogItemId");

-- CreateIndex
CREATE INDEX "Recipe_status_idx" ON "Recipe"("status");

-- CreateIndex
CREATE UNIQUE INDEX "RecipeIngredient_recipeId_orden_key" ON "RecipeIngredient"("recipeId", "orden");

-- CreateIndex
CREATE INDEX "RecipeIngredient_recipeId_orden_idx" ON "RecipeIngredient"("recipeId", "orden");

-- CreateIndex
CREATE INDEX "RecipeIngredient_supplyItemId_idx" ON "RecipeIngredient"("supplyItemId");

-- AddForeignKey
ALTER TABLE "SupplyItem" ADD CONSTRAINT "SupplyItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SupplyCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_foodCatalogItemId_fkey" FOREIGN KEY ("foodCatalogItemId") REFERENCES "FoodCatalogItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_supplyItemId_fkey" FOREIGN KEY ("supplyItemId") REFERENCES "SupplyItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
