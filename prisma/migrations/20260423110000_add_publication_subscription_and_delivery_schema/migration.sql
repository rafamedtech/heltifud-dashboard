-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MenuPublicationStatus') THEN
    CREATE TYPE "MenuPublicationStatus" AS ENUM (
      'PUBLICADA',
      'GENERANDO',
      'GENERADA',
      'CERRADA',
      'CANCELADA',
      'SUPERSEDIDA'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MenuDaySelectionStrategy') THEN
    CREATE TYPE "MenuDaySelectionStrategy" AS ENUM (
      'PRIMEROS_N_DIAS'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliverySplitStrategy') THEN
    CREATE TYPE "DeliverySplitStrategy" AS ENUM (
      'POR_RANGO_DE_DIAS'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserPlanSubscriptionStatus') THEN
    CREATE TYPE "UserPlanSubscriptionStatus" AS ENUM (
      'ACTIVA',
      'PAUSADA',
      'CANCELADA',
      'VENCIDA'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderOrigin') THEN
    CREATE TYPE "OrderOrigin" AS ENUM (
      'MANUAL',
      'PUBLICACION'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeliveryWindowStatus') THEN
    CREATE TYPE "DeliveryWindowStatus" AS ENUM (
      'PLANIFICADA',
      'EN_RUTA',
      'ENTREGADA',
      'CANCELADA'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderDeliveryStatus') THEN
    CREATE TYPE "OrderDeliveryStatus" AS ENUM (
      'PENDIENTE',
      'PROGRAMADA',
      'EN_RUTA',
      'ENTREGADA',
      'CANCELADA'
    );
  END IF;
END
$$;

-- AlterTable Order
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "menuPublicationId" TEXT,
  ADD COLUMN IF NOT EXISTS "origin" "OrderOrigin" NOT NULL DEFAULT 'MANUAL';

-- AlterTable OrderPlan
ALTER TABLE "OrderPlan"
  ADD COLUMN IF NOT EXISTS "userPlanSubscriptionId" TEXT;

-- AlterTable OrderPlanSlot
ALTER TABLE "OrderPlanSlot"
  ADD COLUMN IF NOT EXISTS "menuPublicationSlotId" TEXT,
  ADD COLUMN IF NOT EXISTS "orderDeliveryId" TEXT,
  ADD COLUMN IF NOT EXISTS "serviceDate" DATE;

-- AlterTable OrderPlanSlotComponent
ALTER TABLE "OrderPlanSlotComponent"
  ADD COLUMN IF NOT EXISTS "menuPublicationSlotComponentId" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MenuPublication" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sourceWeeklyMenuId" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "status" "MenuPublicationStatus" NOT NULL DEFAULT 'PUBLICADA',
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "generatedAt" TIMESTAMP(3),
  "closedAt" TIMESTAMP(3),
  "supersededAt" TIMESTAMP(3),
  "menuNameSnapshot" TEXT NOT NULL,
  "menuStartDateSnapshot" TIMESTAMP(3) NOT NULL,
  "menuEndDateSnapshot" TIMESTAMP(3) NOT NULL,
  "eligibleDayCount" INTEGER NOT NULL DEFAULT 0,
  "daySelectionStrategy" "MenuDaySelectionStrategy" NOT NULL DEFAULT 'PRIMEROS_N_DIAS',
  "deliverySplitStrategy" "DeliverySplitStrategy" NOT NULL DEFAULT 'POR_RANGO_DE_DIAS',

  CONSTRAINT "MenuPublication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MenuPublicationDeliveryWindow" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "menuPublicationId" TEXT NOT NULL,
  "deliveryIndex" INTEGER NOT NULL,
  "label" TEXT NOT NULL DEFAULT '',
  "startMenuDayOrder" INTEGER NOT NULL,
  "endMenuDayOrder" INTEGER NOT NULL,
  "scheduledFor" TIMESTAMP(3),
  "status" "DeliveryWindowStatus" NOT NULL DEFAULT 'PLANIFICADA',

  CONSTRAINT "MenuPublicationDeliveryWindow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MenuPublicationSlot" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "menuPublicationId" TEXT NOT NULL,
  "deliveryWindowId" TEXT,
  "sourceMenuDayId" TEXT,
  "sourceDaySlotId" TEXT,
  "serviceDate" DATE NOT NULL,
  "dayOfWeek" "DayOfWeek" NOT NULL,
  "menuDayOrder" INTEGER NOT NULL,
  "slotType" "SlotType" NOT NULL,
  "contenedor" TEXT,

  CONSTRAINT "MenuPublicationSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MenuPublicationSlotComponent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "menuPublicationSlotId" TEXT NOT NULL,
  "sourceFoodComponentId" TEXT,
  "sourceCatalogItemId" TEXT,
  "sourceRecipeId" TEXT,
  "componentIndex" INTEGER NOT NULL,
  "componentRole" "ComponentRole" NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "calorias" INTEGER NOT NULL,
  "imagen" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "recipeVersionSnapshot" INTEGER,

  CONSTRAINT "MenuPublicationSlotComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "MenuPublicationSlotIngredient" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "menuPublicationSlotComponentId" TEXT NOT NULL,
  "sourceRecipeIngredientId" TEXT,
  "sourceSupplyItemId" TEXT,
  "ingredientIndex" INTEGER NOT NULL,
  "grupo" TEXT,
  "cantidad" DECIMAL(10,2) NOT NULL,
  "unidad" "MeasurementUnit" NOT NULL,
  "quantityInBaseUnit" DECIMAL(12,4),
  "wasteFactor" DECIMAL(5,4),
  "opcional" BOOLEAN NOT NULL DEFAULT false,
  "supplyNameSnapshot" TEXT NOT NULL,
  "supplyUnitBaseSnapshot" "MeasurementUnit" NOT NULL,
  "supplyCategoryNameSnapshot" TEXT,
  "costoReferencialSnapshot" DECIMAL(10,2),

  CONSTRAINT "MenuPublicationSlotIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserPlanSubscription" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "status" "UserPlanSubscriptionStatus" NOT NULL DEFAULT 'ACTIVA',
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "daysPerCycle" INTEGER NOT NULL,
  "unitPriceSnapshot" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "startsAt" DATE NOT NULL,
  "endsAt" DATE,
  "pausedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "autoGenerate" BOOLEAN NOT NULL DEFAULT true,
  "notas" TEXT NOT NULL DEFAULT '',

  CONSTRAINT "UserPlanSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderDelivery" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orderId" TEXT NOT NULL,
  "menuPublicationDeliveryWindowId" TEXT,
  "deliveryIndex" INTEGER NOT NULL,
  "scheduledFor" TIMESTAMP(3),
  "status" "OrderDeliveryStatus" NOT NULL DEFAULT 'PENDIENTE',
  "slotCount" INTEGER NOT NULL DEFAULT 0,
  "notas" TEXT NOT NULL DEFAULT '',

  CONSTRAINT "OrderDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderAddressSnapshot" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orderId" TEXT NOT NULL,
  "etiqueta" TEXT NOT NULL DEFAULT '',
  "destinatario" TEXT NOT NULL,
  "telefono" TEXT NOT NULL DEFAULT '',
  "linea1" TEXT NOT NULL,
  "linea2" TEXT NOT NULL DEFAULT '',
  "colonia" TEXT NOT NULL DEFAULT '',
  "ciudad" TEXT NOT NULL,
  "estado" TEXT NOT NULL,
  "codigoPostal" TEXT NOT NULL DEFAULT '',
  "pais" TEXT NOT NULL DEFAULT 'MX',
  "referencias" TEXT NOT NULL DEFAULT '',

  CONSTRAINT "OrderAddressSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MenuPublication_sourceWeeklyMenuId_version_key" ON "MenuPublication"("sourceWeeklyMenuId", "version");
CREATE INDEX IF NOT EXISTS "MenuPublication_status_publishedAt_idx" ON "MenuPublication"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS "MenuPublication_sourceWeeklyMenuId_publishedAt_idx" ON "MenuPublication"("sourceWeeklyMenuId", "publishedAt");
CREATE UNIQUE INDEX IF NOT EXISTS "MenuPublication_single_current_idx" ON "MenuPublication"("isCurrent") WHERE "isCurrent" = true;

CREATE UNIQUE INDEX IF NOT EXISTS "MenuPublicationDeliveryWindow_menuPublicationId_deliveryIndex_key" ON "MenuPublicationDeliveryWindow"("menuPublicationId", "deliveryIndex");
CREATE INDEX IF NOT EXISTS "MenuPublicationDeliveryWindow_menuPublicationId_status_idx" ON "MenuPublicationDeliveryWindow"("menuPublicationId", "status");
CREATE INDEX IF NOT EXISTS "MenuPublicationDeliveryWindow_scheduledFor_status_idx" ON "MenuPublicationDeliveryWindow"("scheduledFor", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "MenuPublicationSlot_menuPublicationId_serviceDate_slotType_key" ON "MenuPublicationSlot"("menuPublicationId", "serviceDate", "slotType");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlot_menuPublicationId_slotType_serviceDate_idx" ON "MenuPublicationSlot"("menuPublicationId", "slotType", "serviceDate");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlot_sourceDaySlotId_idx" ON "MenuPublicationSlot"("sourceDaySlotId");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlot_deliveryWindowId_idx" ON "MenuPublicationSlot"("deliveryWindowId");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlot_menuPublicationId_menuDayOrder_idx" ON "MenuPublicationSlot"("menuPublicationId", "menuDayOrder");

CREATE UNIQUE INDEX IF NOT EXISTS "MenuPublicationSlotComponent_menuPublicationSlotId_componentIndex_key" ON "MenuPublicationSlotComponent"("menuPublicationSlotId", "componentIndex");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlotComponent_menuPublicationSlotId_componentRole_componentIndex_idx" ON "MenuPublicationSlotComponent"("menuPublicationSlotId", "componentRole", "componentIndex");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlotComponent_sourceCatalogItemId_idx" ON "MenuPublicationSlotComponent"("sourceCatalogItemId");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlotComponent_sourceFoodComponentId_idx" ON "MenuPublicationSlotComponent"("sourceFoodComponentId");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlotComponent_sourceRecipeId_idx" ON "MenuPublicationSlotComponent"("sourceRecipeId");

CREATE UNIQUE INDEX IF NOT EXISTS "MenuPublicationSlotIngredient_menuPublicationSlotComponentId_ingredientIndex_key" ON "MenuPublicationSlotIngredient"("menuPublicationSlotComponentId", "ingredientIndex");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlotIngredient_sourceSupplyItemId_idx" ON "MenuPublicationSlotIngredient"("sourceSupplyItemId");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlotIngredient_menuPublicationSlotComponentId_ingredientIndex_idx" ON "MenuPublicationSlotIngredient"("menuPublicationSlotComponentId", "ingredientIndex");
CREATE INDEX IF NOT EXISTS "MenuPublicationSlotIngredient_sourceRecipeIngredientId_idx" ON "MenuPublicationSlotIngredient"("sourceRecipeIngredientId");

CREATE INDEX IF NOT EXISTS "UserPlanSubscription_userId_status_idx" ON "UserPlanSubscription"("userId", "status");
CREATE INDEX IF NOT EXISTS "UserPlanSubscription_planId_status_idx" ON "UserPlanSubscription"("planId", "status");
CREATE INDEX IF NOT EXISTS "UserPlanSubscription_status_startsAt_endsAt_idx" ON "UserPlanSubscription"("status", "startsAt", "endsAt");
CREATE INDEX IF NOT EXISTS "UserPlanSubscription_userId_autoGenerate_status_idx" ON "UserPlanSubscription"("userId", "autoGenerate", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "UserPlanSubscription_live_user_plan_idx" ON "UserPlanSubscription"("userId", "planId") WHERE "status" IN ('ACTIVA'::"UserPlanSubscriptionStatus", 'PAUSADA'::"UserPlanSubscriptionStatus");

CREATE INDEX IF NOT EXISTS "Order_menuPublicationId_status_createdAt_idx" ON "Order"("menuPublicationId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_origin_status_createdAt_idx" ON "Order"("origin", "status", "createdAt");

CREATE INDEX IF NOT EXISTS "OrderPlan_userPlanSubscriptionId_idx" ON "OrderPlan"("userPlanSubscriptionId");

CREATE INDEX IF NOT EXISTS "OrderPlanSlot_menuPublicationSlotId_idx" ON "OrderPlanSlot"("menuPublicationSlotId");
CREATE INDEX IF NOT EXISTS "OrderPlanSlot_orderDeliveryId_idx" ON "OrderPlanSlot"("orderDeliveryId");
CREATE INDEX IF NOT EXISTS "OrderPlanSlot_serviceDate_idx" ON "OrderPlanSlot"("serviceDate");

CREATE INDEX IF NOT EXISTS "OrderPlanSlotComponent_menuPublicationSlotComponentId_idx" ON "OrderPlanSlotComponent"("menuPublicationSlotComponentId");

CREATE UNIQUE INDEX IF NOT EXISTS "OrderDelivery_orderId_deliveryIndex_key" ON "OrderDelivery"("orderId", "deliveryIndex");
CREATE INDEX IF NOT EXISTS "OrderDelivery_menuPublicationDeliveryWindowId_idx" ON "OrderDelivery"("menuPublicationDeliveryWindowId");
CREATE INDEX IF NOT EXISTS "OrderDelivery_orderId_status_idx" ON "OrderDelivery"("orderId", "status");
CREATE INDEX IF NOT EXISTS "OrderDelivery_scheduledFor_status_idx" ON "OrderDelivery"("scheduledFor", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "OrderAddressSnapshot_orderId_key" ON "OrderAddressSnapshot"("orderId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublication_sourceWeeklyMenuId_fkey'
  ) THEN
    ALTER TABLE "MenuPublication"
      ADD CONSTRAINT "MenuPublication_sourceWeeklyMenuId_fkey"
      FOREIGN KEY ("sourceWeeklyMenuId") REFERENCES "WeeklyMenu"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationDeliveryWindow_menuPublicationId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationDeliveryWindow"
      ADD CONSTRAINT "MenuPublicationDeliveryWindow_menuPublicationId_fkey"
      FOREIGN KEY ("menuPublicationId") REFERENCES "MenuPublication"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlot_menuPublicationId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlot"
      ADD CONSTRAINT "MenuPublicationSlot_menuPublicationId_fkey"
      FOREIGN KEY ("menuPublicationId") REFERENCES "MenuPublication"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlot_deliveryWindowId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlot"
      ADD CONSTRAINT "MenuPublicationSlot_deliveryWindowId_fkey"
      FOREIGN KEY ("deliveryWindowId") REFERENCES "MenuPublicationDeliveryWindow"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlot_sourceMenuDayId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlot"
      ADD CONSTRAINT "MenuPublicationSlot_sourceMenuDayId_fkey"
      FOREIGN KEY ("sourceMenuDayId") REFERENCES "MenuDay"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlot_sourceDaySlotId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlot"
      ADD CONSTRAINT "MenuPublicationSlot_sourceDaySlotId_fkey"
      FOREIGN KEY ("sourceDaySlotId") REFERENCES "DaySlot"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotComponent_menuPublicationSlotId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlotComponent"
      ADD CONSTRAINT "MenuPublicationSlotComponent_menuPublicationSlotId_fkey"
      FOREIGN KEY ("menuPublicationSlotId") REFERENCES "MenuPublicationSlot"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotComponent_sourceFoodComponentId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlotComponent"
      ADD CONSTRAINT "MenuPublicationSlotComponent_sourceFoodComponentId_fkey"
      FOREIGN KEY ("sourceFoodComponentId") REFERENCES "FoodComponent"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotComponent_sourceCatalogItemId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlotComponent"
      ADD CONSTRAINT "MenuPublicationSlotComponent_sourceCatalogItemId_fkey"
      FOREIGN KEY ("sourceCatalogItemId") REFERENCES "FoodCatalogItem"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotComponent_sourceRecipeId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlotComponent"
      ADD CONSTRAINT "MenuPublicationSlotComponent_sourceRecipeId_fkey"
      FOREIGN KEY ("sourceRecipeId") REFERENCES "Recipe"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotIngredient_menuPublicationSlotComponentId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlotIngredient"
      ADD CONSTRAINT "MenuPublicationSlotIngredient_menuPublicationSlotComponentId_fkey"
      FOREIGN KEY ("menuPublicationSlotComponentId") REFERENCES "MenuPublicationSlotComponent"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotIngredient_sourceRecipeIngredientId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlotIngredient"
      ADD CONSTRAINT "MenuPublicationSlotIngredient_sourceRecipeIngredientId_fkey"
      FOREIGN KEY ("sourceRecipeIngredientId") REFERENCES "RecipeIngredient"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotIngredient_sourceSupplyItemId_fkey'
  ) THEN
    ALTER TABLE "MenuPublicationSlotIngredient"
      ADD CONSTRAINT "MenuPublicationSlotIngredient_sourceSupplyItemId_fkey"
      FOREIGN KEY ("sourceSupplyItemId") REFERENCES "SupplyItem"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPlanSubscription_userId_fkey'
  ) THEN
    ALTER TABLE "UserPlanSubscription"
      ADD CONSTRAINT "UserPlanSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPlanSubscription_planId_fkey'
  ) THEN
    ALTER TABLE "UserPlanSubscription"
      ADD CONSTRAINT "UserPlanSubscription_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "Plan"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Order_menuPublicationId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_menuPublicationId_fkey"
      FOREIGN KEY ("menuPublicationId") REFERENCES "MenuPublication"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderPlan_userPlanSubscriptionId_fkey'
  ) THEN
    ALTER TABLE "OrderPlan"
      ADD CONSTRAINT "OrderPlan_userPlanSubscriptionId_fkey"
      FOREIGN KEY ("userPlanSubscriptionId") REFERENCES "UserPlanSubscription"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderPlanSlot_menuPublicationSlotId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlot"
      ADD CONSTRAINT "OrderPlanSlot_menuPublicationSlotId_fkey"
      FOREIGN KEY ("menuPublicationSlotId") REFERENCES "MenuPublicationSlot"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderPlanSlot_orderDeliveryId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlot"
      ADD CONSTRAINT "OrderPlanSlot_orderDeliveryId_fkey"
      FOREIGN KEY ("orderDeliveryId") REFERENCES "OrderDelivery"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderPlanSlotComponent_menuPublicationSlotComponentId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlotComponent"
      ADD CONSTRAINT "OrderPlanSlotComponent_menuPublicationSlotComponentId_fkey"
      FOREIGN KEY ("menuPublicationSlotComponentId") REFERENCES "MenuPublicationSlotComponent"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderDelivery_orderId_fkey'
  ) THEN
    ALTER TABLE "OrderDelivery"
      ADD CONSTRAINT "OrderDelivery_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderDelivery_menuPublicationDeliveryWindowId_fkey'
  ) THEN
    ALTER TABLE "OrderDelivery"
      ADD CONSTRAINT "OrderDelivery_menuPublicationDeliveryWindowId_fkey"
      FOREIGN KEY ("menuPublicationDeliveryWindowId") REFERENCES "MenuPublicationDeliveryWindow"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderAddressSnapshot_orderId_fkey'
  ) THEN
    ALTER TABLE "OrderAddressSnapshot"
      ADD CONSTRAINT "OrderAddressSnapshot_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddCheckConstraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublication_version_positive'
  ) THEN
    ALTER TABLE "MenuPublication"
      ADD CONSTRAINT "MenuPublication_version_positive"
      CHECK ("version" > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublication_eligibleDayCount_nonnegative'
  ) THEN
    ALTER TABLE "MenuPublication"
      ADD CONSTRAINT "MenuPublication_eligibleDayCount_nonnegative"
      CHECK ("eligibleDayCount" >= 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationDeliveryWindow_valid_range'
  ) THEN
    ALTER TABLE "MenuPublicationDeliveryWindow"
      ADD CONSTRAINT "MenuPublicationDeliveryWindow_valid_range"
      CHECK ("startMenuDayOrder" > 0 AND "endMenuDayOrder" >= "startMenuDayOrder");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotComponent_componentIndex_positive'
  ) THEN
    ALTER TABLE "MenuPublicationSlotComponent"
      ADD CONSTRAINT "MenuPublicationSlotComponent_componentIndex_positive"
      CHECK ("componentIndex" > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MenuPublicationSlotIngredient_ingredientIndex_positive'
  ) THEN
    ALTER TABLE "MenuPublicationSlotIngredient"
      ADD CONSTRAINT "MenuPublicationSlotIngredient_ingredientIndex_positive"
      CHECK ("ingredientIndex" > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPlanSubscription_quantity_positive'
  ) THEN
    ALTER TABLE "UserPlanSubscription"
      ADD CONSTRAINT "UserPlanSubscription_quantity_positive"
      CHECK ("quantity" > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPlanSubscription_daysPerCycle_positive'
  ) THEN
    ALTER TABLE "UserPlanSubscription"
      ADD CONSTRAINT "UserPlanSubscription_daysPerCycle_positive"
      CHECK ("daysPerCycle" > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UserPlanSubscription_valid_date_range'
  ) THEN
    ALTER TABLE "UserPlanSubscription"
      ADD CONSTRAINT "UserPlanSubscription_valid_date_range"
      CHECK ("endsAt" IS NULL OR "startsAt" <= "endsAt");
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderDelivery_deliveryIndex_positive'
  ) THEN
    ALTER TABLE "OrderDelivery"
      ADD CONSTRAINT "OrderDelivery_deliveryIndex_positive"
      CHECK ("deliveryIndex" > 0);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderDelivery_slotCount_nonnegative'
  ) THEN
    ALTER TABLE "OrderDelivery"
      ADD CONSTRAINT "OrderDelivery_slotCount_nonnegative"
      CHECK ("slotCount" >= 0);
  END IF;
END
$$;

-- Backfill
UPDATE "Order"
SET "origin" = 'MANUAL'
WHERE "origin" IS NULL;

INSERT INTO "OrderAddressSnapshot" (
  "id",
  "createdAt",
  "updatedAt",
  "orderId",
  "etiqueta",
  "destinatario",
  "telefono",
  "linea1",
  "linea2",
  "colonia",
  "ciudad",
  "estado",
  "codigoPostal",
  "pais",
  "referencias"
)
SELECT
  gen_random_uuid()::text,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  o."id",
  COALESCE(ua."etiqueta", ''),
  COALESCE(ua."destinatario", ''),
  COALESCE(ua."telefono", ''),
  COALESCE(ua."linea1", ''),
  COALESCE(ua."linea2", ''),
  COALESCE(ua."colonia", ''),
  COALESCE(ua."ciudad", ''),
  COALESCE(ua."estado", ''),
  COALESCE(ua."codigoPostal", ''),
  COALESCE(ua."pais", 'MX'),
  COALESCE(ua."referencias", '')
FROM "Order" o
JOIN "UserAddress" ua ON ua."id" = o."deliveryAddressId"
LEFT JOIN "OrderAddressSnapshot" oas ON oas."orderId" = o."id"
WHERE o."deliveryAddressId" IS NOT NULL
  AND oas."orderId" IS NULL;

-- Views
CREATE OR REPLACE VIEW "vw_publication_customer_menu" AS
SELECT
  mp."id" AS menu_publication_id,
  o."id" AS order_id,
  o."orderNumber" AS order_number,
  o."status" AS order_status,
  o."paymentStatus" AS payment_status,
  o."userId" AS user_id,
  u."nombre" AS user_nombre,
  u."apellidos" AS user_apellidos,
  ops."id" AS order_plan_slot_id,
  op."id" AS order_plan_id,
  op."planId" AS plan_id,
  p."nombre" AS plan_nombre,
  op."planTypeSnapshot" AS plan_type_snapshot,
  od."id" AS order_delivery_id,
  od."deliveryIndex" AS delivery_index,
  od."scheduledFor" AS delivery_scheduled_for,
  od."status" AS delivery_status,
  oas."destinatario" AS delivery_destinatario,
  oas."linea1" AS delivery_linea1,
  oas."linea2" AS delivery_linea2,
  oas."colonia" AS delivery_colonia,
  oas."ciudad" AS delivery_ciudad,
  oas."estado" AS delivery_estado,
  oas."codigoPostal" AS delivery_codigo_postal,
  oas."pais" AS delivery_pais,
  ops."serviceDate" AS service_date,
  ops."dayOfWeek" AS day_of_week,
  ops."menuDayOrder" AS menu_day_order,
  ops."slotType" AS slot_type,
  ops."contenedor" AS contenedor,
  ops."selectionIndex" AS selection_index,
  COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'orderPlanSlotComponentId', opsc."id",
        'componentRole', opsc."componentRole",
        'nombre', opsc."nombre",
        'descripcion', opsc."descripcion",
        'calorias', opsc."calorias",
        'imagen', opsc."imagen",
        'tipo', opsc."tipo",
        'sourceCatalogItemId', opsc."sourceCatalogItemId"
      )
      ORDER BY opsc."componentRole"::text, opsc."nombre"
    ) FILTER (WHERE opsc."id" IS NOT NULL),
    '[]'::jsonb
  ) AS components
FROM "Order" o
JOIN "MenuPublication" mp ON mp."id" = o."menuPublicationId"
JOIN "User" u ON u."id" = o."userId"
JOIN "OrderPlan" op ON op."orderId" = o."id"
JOIN "Plan" p ON p."id" = op."planId"
JOIN "OrderPlanSlot" ops ON ops."orderPlanId" = op."id"
LEFT JOIN "OrderDelivery" od ON od."id" = ops."orderDeliveryId"
LEFT JOIN "OrderAddressSnapshot" oas ON oas."orderId" = o."id"
LEFT JOIN "OrderPlanSlotComponent" opsc ON opsc."orderPlanSlotId" = ops."id"
GROUP BY
  mp."id",
  o."id",
  o."orderNumber",
  o."status",
  o."paymentStatus",
  o."userId",
  u."nombre",
  u."apellidos",
  ops."id",
  op."id",
  op."planId",
  p."nombre",
  op."planTypeSnapshot",
  od."id",
  od."deliveryIndex",
  od."scheduledFor",
  od."status",
  oas."destinatario",
  oas."linea1",
  oas."linea2",
  oas."colonia",
  oas."ciudad",
  oas."estado",
  oas."codigoPostal",
  oas."pais",
  ops."serviceDate",
  ops."dayOfWeek",
  ops."menuDayOrder",
  ops."slotType",
  ops."contenedor",
  ops."selectionIndex";

CREATE OR REPLACE VIEW "vw_publication_production_requirements" AS
SELECT
  o."menuPublicationId" AS menu_publication_id,
  ops."serviceDate" AS service_date,
  ops."slotType" AS slot_type,
  opsc."menuPublicationSlotComponentId" AS menu_publication_slot_component_id,
  COALESCE(opsc."sourceCatalogItemId", mpsc."sourceCatalogItemId") AS source_catalog_item_id,
  opsc."componentRole" AS component_role,
  opsc."nombre" AS component_name,
  opsc."descripcion" AS component_description,
  opsc."tipo" AS component_type,
  COUNT(*)::INTEGER AS total_component_portions,
  COUNT(DISTINCT ops."id")::INTEGER AS total_slot_count
FROM "OrderPlanSlotComponent" opsc
JOIN "OrderPlanSlot" ops ON ops."id" = opsc."orderPlanSlotId"
JOIN "OrderPlan" op ON op."id" = ops."orderPlanId"
JOIN "Order" o ON o."id" = op."orderId"
LEFT JOIN "MenuPublicationSlotComponent" mpsc ON mpsc."id" = opsc."menuPublicationSlotComponentId"
WHERE o."menuPublicationId" IS NOT NULL
GROUP BY
  o."menuPublicationId",
  ops."serviceDate",
  ops."slotType",
  opsc."menuPublicationSlotComponentId",
  COALESCE(opsc."sourceCatalogItemId", mpsc."sourceCatalogItemId"),
  opsc."componentRole",
  opsc."nombre",
  opsc."descripcion",
  opsc."tipo";

CREATE OR REPLACE VIEW "vw_publication_shopping_requirements" AS
WITH slot_assignments AS (
  SELECT
    ops."menuPublicationSlotId",
    ops."orderDeliveryId",
    COUNT(*)::INTEGER AS assigned_slot_count
  FROM "OrderPlanSlot" ops
  JOIN "OrderPlan" op ON op."id" = ops."orderPlanId"
  JOIN "Order" o ON o."id" = op."orderId"
  WHERE o."menuPublicationId" IS NOT NULL
    AND ops."menuPublicationSlotId" IS NOT NULL
  GROUP BY ops."menuPublicationSlotId", ops."orderDeliveryId"
)
SELECT
  mps."menuPublicationId" AS menu_publication_id,
  mps."serviceDate" AS service_date,
  od."id" AS order_delivery_id,
  od."deliveryIndex" AS delivery_index,
  od."scheduledFor" AS delivery_scheduled_for,
  mpsi."sourceSupplyItemId" AS source_supply_item_id,
  mpsi."supplyNameSnapshot" AS supply_name,
  mpsi."supplyUnitBaseSnapshot" AS supply_unit_base,
  mpsi."supplyCategoryNameSnapshot" AS supply_category_name,
  SUM(sa.assigned_slot_count * mpsi."cantidad") AS total_quantity,
  SUM(sa.assigned_slot_count * COALESCE(mpsi."quantityInBaseUnit", 0)) AS total_quantity_in_base_unit,
  MAX(mpsi."costoReferencialSnapshot") AS unit_cost_reference,
  SUM(
    sa.assigned_slot_count
    * COALESCE(mpsi."quantityInBaseUnit", mpsi."cantidad")
    * COALESCE(mpsi."costoReferencialSnapshot", 0)
  ) AS estimated_cost
FROM slot_assignments sa
JOIN "MenuPublicationSlot" mps ON mps."id" = sa."menuPublicationSlotId"
JOIN "MenuPublicationSlotComponent" mpsc ON mpsc."menuPublicationSlotId" = mps."id"
JOIN "MenuPublicationSlotIngredient" mpsi ON mpsi."menuPublicationSlotComponentId" = mpsc."id"
LEFT JOIN "OrderDelivery" od ON od."id" = sa."orderDeliveryId"
GROUP BY
  mps."menuPublicationId",
  mps."serviceDate",
  od."id",
  od."deliveryIndex",
  od."scheduledFor",
  mpsi."sourceSupplyItemId",
  mpsi."supplyNameSnapshot",
  mpsi."supplyUnitBaseSnapshot",
  mpsi."supplyCategoryNameSnapshot";

CREATE OR REPLACE VIEW "vw_order_delivery_manifest" AS
SELECT
  od."id" AS order_delivery_id,
  od."orderId" AS order_id,
  o."orderNumber" AS order_number,
  o."menuPublicationId" AS menu_publication_id,
  od."deliveryIndex" AS delivery_index,
  od."scheduledFor" AS scheduled_for,
  od."status" AS delivery_status,
  o."status" AS order_status,
  o."paymentStatus" AS payment_status,
  o."userId" AS user_id,
  u."nombre" AS user_nombre,
  u."apellidos" AS user_apellidos,
  u."telefono" AS user_telefono,
  oas."destinatario" AS delivery_destinatario,
  oas."telefono" AS delivery_telefono,
  oas."linea1" AS delivery_linea1,
  oas."linea2" AS delivery_linea2,
  oas."colonia" AS delivery_colonia,
  oas."ciudad" AS delivery_ciudad,
  oas."estado" AS delivery_estado,
  oas."codigoPostal" AS delivery_codigo_postal,
  oas."referencias" AS delivery_referencias,
  od."slotCount" AS slot_count,
  COALESCE(slot_stats.assigned_slot_count, 0) AS assigned_slot_count,
  COALESCE(plan_stats.requested_dish_count, 0) AS requested_dish_count,
  COALESCE(plan_stats.resolved_dish_count, 0) AS resolved_dish_count
FROM "OrderDelivery" od
JOIN "Order" o ON o."id" = od."orderId"
JOIN "User" u ON u."id" = o."userId"
LEFT JOIN "OrderAddressSnapshot" oas ON oas."orderId" = o."id"
LEFT JOIN LATERAL (
  SELECT COUNT(*)::INTEGER AS assigned_slot_count
  FROM "OrderPlanSlot" ops
  WHERE ops."orderDeliveryId" = od."id"
) AS slot_stats ON true
LEFT JOIN LATERAL (
  SELECT
    COALESCE(SUM(op."requestedDishCount"), 0)::INTEGER AS requested_dish_count,
    COALESCE(SUM(op."assignedDishCount"), 0)::INTEGER AS resolved_dish_count
  FROM "OrderPlan" op
  WHERE op."orderId" = o."id"
) AS plan_stats ON true;
