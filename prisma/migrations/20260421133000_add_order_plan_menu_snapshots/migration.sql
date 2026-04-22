-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderPlanResolutionStatus') THEN
    CREATE TYPE "OrderPlanResolutionStatus" AS ENUM (
      'PENDIENTE',
      'PARCIAL',
      'COMPLETO'
    );
  END IF;
END
$$;

-- AlterTable Order
ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "menuResolvedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "totalRequestedDishCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalAssignedDishCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "totalPendingDishCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable OrderPlan
ALTER TABLE "OrderPlan"
  ADD COLUMN IF NOT EXISTS "planDishCountSnapshot" INTEGER,
  ADD COLUMN IF NOT EXISTS "planTypeSnapshot" "PlanType",
  ADD COLUMN IF NOT EXISTS "requestedDishCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "assignedDishCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pendingDishCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "resolutionStatus" "OrderPlanResolutionStatus" NOT NULL DEFAULT 'PENDIENTE';

-- Backfill OrderPlan snapshot fields from Plan
UPDATE "OrderPlan" AS op
SET
  "planDishCountSnapshot" = COALESCE(p."dishCount", 0),
  "planTypeSnapshot" = p."tipo",
  "requestedDishCount" = op."quantity" * COALESCE(p."dishCount", 0),
  "assignedDishCount" = COALESCE(op."assignedDishCount", 0),
  "pendingDishCount" = CASE
    WHEN COALESCE(op."assignedDishCount", 0) >= op."quantity" * COALESCE(p."dishCount", 0) THEN 0
    ELSE op."quantity" * COALESCE(p."dishCount", 0) - COALESCE(op."assignedDishCount", 0)
  END,
  "resolutionStatus" = CASE
    WHEN COALESCE(op."assignedDishCount", 0) >= op."quantity" * COALESCE(p."dishCount", 0)
      AND op."quantity" * COALESCE(p."dishCount", 0) > 0
    THEN 'COMPLETO'::"OrderPlanResolutionStatus"
    WHEN COALESCE(op."assignedDishCount", 0) > 0
    THEN 'PARCIAL'::"OrderPlanResolutionStatus"
    ELSE 'PENDIENTE'::"OrderPlanResolutionStatus"
  END
FROM "Plan" AS p
WHERE p."id" = op."planId"
  AND (
    op."planDishCountSnapshot" IS NULL
    OR op."planTypeSnapshot" IS NULL
    OR op."requestedDishCount" IS NULL
  );

-- Fill any remaining nulls conservatively
UPDATE "OrderPlan"
SET
  "planDishCountSnapshot" = COALESCE("planDishCountSnapshot", 0),
  "requestedDishCount" = COALESCE("requestedDishCount", COALESCE("quantity", 0) * COALESCE("planDishCountSnapshot", 0)),
  "pendingDishCount" = COALESCE("pendingDishCount", COALESCE("requestedDishCount", 0) - COALESCE("assignedDishCount", 0))
WHERE "planDishCountSnapshot" IS NULL
   OR "requestedDishCount" IS NULL
   OR "pendingDishCount" IS NULL;

-- Ensure planTypeSnapshot is not null for all existing rows before constraint
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "OrderPlan" WHERE "planTypeSnapshot" IS NULL) THEN
    RAISE EXCEPTION 'No se pudo backfillear planTypeSnapshot en OrderPlan.';
  END IF;
END
$$;

ALTER TABLE "OrderPlan"
  ALTER COLUMN "planDishCountSnapshot" SET NOT NULL,
  ALTER COLUMN "planTypeSnapshot" SET NOT NULL,
  ALTER COLUMN "requestedDishCount" SET NOT NULL;

-- Backfill Order counters from OrderPlan
UPDATE "Order" AS o
SET
  "totalRequestedDishCount" = COALESCE(t."requested", 0),
  "totalAssignedDishCount" = COALESCE(t."assigned", 0),
  "totalPendingDishCount" = COALESCE(t."pending", 0)
FROM (
  SELECT
    "orderId",
    SUM("requestedDishCount")::INTEGER AS "requested",
    SUM("assignedDishCount")::INTEGER AS "assigned",
    SUM("pendingDishCount")::INTEGER AS "pending"
  FROM "OrderPlan"
  GROUP BY "orderId"
) AS t
WHERE t."orderId" = o."id";

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderPlanSlot" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orderPlanId" TEXT NOT NULL,
  "sourceWeeklyMenuId" TEXT,
  "sourceMenuDayId" TEXT,
  "sourceDaySlotId" TEXT,
  "selectionIndex" INTEGER NOT NULL,
  "dayOfWeek" "DayOfWeek" NOT NULL,
  "menuDayOrder" INTEGER NOT NULL,
  "slotType" "SlotType" NOT NULL,
  "contenedor" TEXT,

  CONSTRAINT "OrderPlanSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderPlanSlotComponent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orderPlanSlotId" TEXT NOT NULL,
  "sourceFoodComponentId" TEXT,
  "sourceCatalogItemId" TEXT,
  "componentRole" "ComponentRole" NOT NULL,
  "nombre" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "calorias" INTEGER NOT NULL,
  "imagen" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,

  CONSTRAINT "OrderPlanSlotComponent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "OrderPlanSlot_orderPlanId_selectionIndex_key" ON "OrderPlanSlot"("orderPlanId", "selectionIndex");
CREATE INDEX IF NOT EXISTS "OrderPlanSlot_sourceDaySlotId_idx" ON "OrderPlanSlot"("sourceDaySlotId");
CREATE INDEX IF NOT EXISTS "OrderPlanSlot_orderPlanId_dayOfWeek_selectionIndex_idx" ON "OrderPlanSlot"("orderPlanId", "dayOfWeek", "selectionIndex");
CREATE INDEX IF NOT EXISTS "OrderPlanSlotComponent_orderPlanSlotId_idx" ON "OrderPlanSlotComponent"("orderPlanSlotId");
CREATE INDEX IF NOT EXISTS "OrderPlanSlotComponent_sourceCatalogItemId_idx" ON "OrderPlanSlotComponent"("sourceCatalogItemId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrderPlanSlot_orderPlanId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlot"
      ADD CONSTRAINT "OrderPlanSlot_orderPlanId_fkey"
      FOREIGN KEY ("orderPlanId") REFERENCES "OrderPlan"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrderPlanSlot_sourceWeeklyMenuId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlot"
      ADD CONSTRAINT "OrderPlanSlot_sourceWeeklyMenuId_fkey"
      FOREIGN KEY ("sourceWeeklyMenuId") REFERENCES "WeeklyMenu"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrderPlanSlot_sourceMenuDayId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlot"
      ADD CONSTRAINT "OrderPlanSlot_sourceMenuDayId_fkey"
      FOREIGN KEY ("sourceMenuDayId") REFERENCES "MenuDay"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrderPlanSlot_sourceDaySlotId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlot"
      ADD CONSTRAINT "OrderPlanSlot_sourceDaySlotId_fkey"
      FOREIGN KEY ("sourceDaySlotId") REFERENCES "DaySlot"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrderPlanSlotComponent_orderPlanSlotId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlotComponent"
      ADD CONSTRAINT "OrderPlanSlotComponent_orderPlanSlotId_fkey"
      FOREIGN KEY ("orderPlanSlotId") REFERENCES "OrderPlanSlot"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrderPlanSlotComponent_sourceFoodComponentId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlotComponent"
      ADD CONSTRAINT "OrderPlanSlotComponent_sourceFoodComponentId_fkey"
      FOREIGN KEY ("sourceFoodComponentId") REFERENCES "FoodComponent"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'OrderPlanSlotComponent_sourceCatalogItemId_fkey'
  ) THEN
    ALTER TABLE "OrderPlanSlotComponent"
      ADD CONSTRAINT "OrderPlanSlotComponent_sourceCatalogItemId_fkey"
      FOREIGN KEY ("sourceCatalogItemId") REFERENCES "FoodCatalogItem"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;
