-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "SlotType" AS ENUM ('DESAYUNO', 'COMIDA', 'CENA', 'SNACK1', 'SNACK2');

-- CreateEnum
CREATE TYPE "ComponentRole" AS ENUM ('PLATILLO_PRINCIPAL', 'GUARNICION_1', 'GUARNICION_2', 'ADICIONAL');

-- CreateTable
CREATE TABLE "WeeklyMenu" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuDay" (
    "id" TEXT NOT NULL,
    "weeklyMenuId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "MenuDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaySlot" (
    "id" TEXT NOT NULL,
    "menuDayId" TEXT NOT NULL,
    "slotType" "SlotType" NOT NULL,
    "contenedor" TEXT,

    CONSTRAINT "DaySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodComponent" (
    "id" TEXT NOT NULL,
    "daySlotId" TEXT NOT NULL,
    "componentRole" "ComponentRole" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "calorias" INTEGER NOT NULL,
    "imagen" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,

    CONSTRAINT "FoodComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodCatalogItem" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "calorias" INTEGER NOT NULL,
    "imagen" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodCatalogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeeklyMenu_isActive_idx" ON "WeeklyMenu"("isActive");

-- CreateIndex
CREATE INDEX "WeeklyMenu_startDate_idx" ON "WeeklyMenu"("startDate");

-- CreateIndex
CREATE INDEX "WeeklyMenu_endDate_idx" ON "WeeklyMenu"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "MenuDay_weeklyMenuId_dayOfWeek_key" ON "MenuDay"("weeklyMenuId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "MenuDay_weeklyMenuId_order_key" ON "MenuDay"("weeklyMenuId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "DaySlot_menuDayId_slotType_key" ON "DaySlot"("menuDayId", "slotType");

-- CreateIndex
CREATE INDEX "FoodComponent_daySlotId_componentRole_idx" ON "FoodComponent"("daySlotId", "componentRole");

-- CreateIndex
CREATE INDEX "FoodCatalogItem_nombre_idx" ON "FoodCatalogItem"("nombre");

-- CreateIndex
CREATE INDEX "FoodCatalogItem_tipo_idx" ON "FoodCatalogItem"("tipo");

-- AddForeignKey
ALTER TABLE "MenuDay" ADD CONSTRAINT "MenuDay_weeklyMenuId_fkey" FOREIGN KEY ("weeklyMenuId") REFERENCES "WeeklyMenu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaySlot" ADD CONSTRAINT "DaySlot_menuDayId_fkey" FOREIGN KEY ("menuDayId") REFERENCES "MenuDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodComponent" ADD CONSTRAINT "FoodComponent_daySlotId_fkey" FOREIGN KEY ("daySlotId") REFERENCES "DaySlot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
