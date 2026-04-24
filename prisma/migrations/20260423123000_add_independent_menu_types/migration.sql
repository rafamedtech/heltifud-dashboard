-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MenuType') THEN
    CREATE TYPE "MenuType" AS ENUM (
      'ESTANDAR',
      'VEGETARIANO'
    );
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "WeeklyMenu"
  ADD COLUMN IF NOT EXISTS "menuType" "MenuType" NOT NULL DEFAULT 'ESTANDAR';

ALTER TABLE "MenuPublication"
  ADD COLUMN IF NOT EXISTS "menuTypeSnapshot" "MenuType" NOT NULL DEFAULT 'ESTANDAR';

ALTER TABLE "UserPlanSubscription"
  ADD COLUMN IF NOT EXISTS "menuType" "MenuType" NOT NULL DEFAULT 'ESTANDAR';

ALTER TABLE "OrderPlan"
  ADD COLUMN IF NOT EXISTS "menuPublicationId" TEXT,
  ADD COLUMN IF NOT EXISTS "menuTypeSnapshot" "MenuType" NOT NULL DEFAULT 'ESTANDAR';

ALTER TABLE "OrderPlanSlot"
  ADD COLUMN IF NOT EXISTS "menuTypeSnapshot" "MenuType" NOT NULL DEFAULT 'ESTANDAR';

-- Backfill
UPDATE "MenuPublication" mp
SET "menuTypeSnapshot" = wm."menuType"
FROM "WeeklyMenu" wm
WHERE wm."id" = mp."sourceWeeklyMenuId";

UPDATE "UserPlanSubscription" ups
SET "menuType" = CASE
  WHEN u."customerType" = 'VEGETARIANO'::"UserCustomerType" THEN 'VEGETARIANO'::"MenuType"
  ELSE 'ESTANDAR'::"MenuType"
END
FROM "User" u
WHERE u."id" = ups."userId";

UPDATE "OrderPlan" op
SET
  "menuPublicationId" = COALESCE(op."menuPublicationId", src."orderMenuPublicationId"),
  "menuTypeSnapshot" = COALESCE(src."subscriptionMenuType", src."publicationMenuType", op."menuTypeSnapshot")
FROM (
  SELECT
    op_inner."id" AS "orderPlanId",
    o."menuPublicationId" AS "orderMenuPublicationId",
    ups."menuType" AS "subscriptionMenuType",
    mp."menuTypeSnapshot" AS "publicationMenuType"
  FROM "OrderPlan" op_inner
  JOIN "Order" o ON o."id" = op_inner."orderId"
  LEFT JOIN "UserPlanSubscription" ups ON ups."id" = op_inner."userPlanSubscriptionId"
  LEFT JOIN "MenuPublication" mp ON mp."id" = o."menuPublicationId"
) src
WHERE src."orderPlanId" = op."id";

UPDATE "OrderPlanSlot" ops
SET "menuTypeSnapshot" = COALESCE(src."publicationMenuType", src."orderPlanMenuType", ops."menuTypeSnapshot")
FROM (
  SELECT
    ops_inner."id" AS "orderPlanSlotId",
    op."menuTypeSnapshot" AS "orderPlanMenuType",
    mps_publication."menuTypeSnapshot" AS "publicationMenuType"
  FROM "OrderPlanSlot" ops_inner
  JOIN "OrderPlan" op ON op."id" = ops_inner."orderPlanId"
  LEFT JOIN "MenuPublicationSlot" mps ON mps."id" = ops_inner."menuPublicationSlotId"
  LEFT JOIN "MenuPublication" mps_publication ON mps_publication."id" = mps."menuPublicationId"
) src
WHERE src."orderPlanSlotId" = ops."id";

-- Rework unique indexes that now need menu type as part of the identity.
DROP INDEX IF EXISTS "MenuPublication_single_current_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "MenuPublication_single_current_per_type_idx"
  ON "MenuPublication"("menuTypeSnapshot")
  WHERE "isCurrent" = true;

DROP INDEX IF EXISTS "UserPlanSubscription_live_user_plan_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "UserPlanSubscription_live_user_plan_menuType_idx"
  ON "UserPlanSubscription"("userId", "planId", "menuType")
  WHERE "status" IN ('ACTIVA'::"UserPlanSubscriptionStatus", 'PAUSADA'::"UserPlanSubscriptionStatus");

DROP INDEX IF EXISTS "OrderPlan_orderId_planId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "OrderPlan_orderId_planId_menuTypeSnapshot_key"
  ON "OrderPlan"("orderId", "planId", "menuTypeSnapshot");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WeeklyMenu_menuType_isActive_idx" ON "WeeklyMenu"("menuType", "isActive");
CREATE INDEX IF NOT EXISTS "WeeklyMenu_menuType_startDate_endDate_idx" ON "WeeklyMenu"("menuType", "startDate", "endDate");
CREATE UNIQUE INDEX IF NOT EXISTS "WeeklyMenu_active_menuType_idx" ON "WeeklyMenu"("menuType") WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS "MenuPublication_menuTypeSnapshot_status_publishedAt_idx" ON "MenuPublication"("menuTypeSnapshot", "status", "publishedAt");
CREATE INDEX IF NOT EXISTS "UserPlanSubscription_userId_menuType_status_idx" ON "UserPlanSubscription"("userId", "menuType", "status");
CREATE INDEX IF NOT EXISTS "UserPlanSubscription_menuType_status_idx" ON "UserPlanSubscription"("menuType", "status");
CREATE INDEX IF NOT EXISTS "OrderPlan_menuPublicationId_idx" ON "OrderPlan"("menuPublicationId");
CREATE INDEX IF NOT EXISTS "OrderPlan_menuTypeSnapshot_idx" ON "OrderPlan"("menuTypeSnapshot");
CREATE INDEX IF NOT EXISTS "OrderPlanSlot_menuTypeSnapshot_serviceDate_idx" ON "OrderPlanSlot"("menuTypeSnapshot", "serviceDate");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'OrderPlan_menuPublicationId_fkey'
  ) THEN
    ALTER TABLE "OrderPlan"
      ADD CONSTRAINT "OrderPlan_menuPublicationId_fkey"
      FOREIGN KEY ("menuPublicationId") REFERENCES "MenuPublication"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;

-- Views
DROP VIEW IF EXISTS "vw_publication_customer_menu";
DROP VIEW IF EXISTS "vw_publication_production_requirements";
DROP VIEW IF EXISTS "vw_publication_shopping_requirements";
DROP VIEW IF EXISTS "vw_order_delivery_manifest";

CREATE VIEW "vw_publication_customer_menu" WITH (security_invoker = true) AS
SELECT
  mp."id" AS menu_publication_id,
  mp."menuTypeSnapshot" AS menu_type,
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
  op."menuTypeSnapshot" AS plan_menu_type,
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
JOIN "User" u ON u."id" = o."userId"
JOIN "OrderPlan" op ON op."orderId" = o."id"
LEFT JOIN "MenuPublication" mp ON mp."id" = COALESCE(op."menuPublicationId", o."menuPublicationId")
JOIN "Plan" p ON p."id" = op."planId"
JOIN "OrderPlanSlot" ops ON ops."orderPlanId" = op."id"
LEFT JOIN "OrderDelivery" od ON od."id" = ops."orderDeliveryId"
LEFT JOIN "OrderAddressSnapshot" oas ON oas."orderId" = o."id"
LEFT JOIN "OrderPlanSlotComponent" opsc ON opsc."orderPlanSlotId" = ops."id"
WHERE COALESCE(op."menuPublicationId", o."menuPublicationId") IS NOT NULL
GROUP BY
  mp."id",
  mp."menuTypeSnapshot",
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
  op."menuTypeSnapshot",
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

CREATE VIEW "vw_publication_production_requirements" WITH (security_invoker = true) AS
SELECT
  COALESCE(op."menuPublicationId", o."menuPublicationId") AS menu_publication_id,
  COALESCE(mp_line."menuTypeSnapshot", mp_order."menuTypeSnapshot", op."menuTypeSnapshot") AS menu_type,
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
LEFT JOIN "MenuPublication" mp_line ON mp_line."id" = op."menuPublicationId"
LEFT JOIN "MenuPublication" mp_order ON mp_order."id" = o."menuPublicationId"
LEFT JOIN "MenuPublicationSlotComponent" mpsc ON mpsc."id" = opsc."menuPublicationSlotComponentId"
WHERE COALESCE(op."menuPublicationId", o."menuPublicationId") IS NOT NULL
GROUP BY
  COALESCE(op."menuPublicationId", o."menuPublicationId"),
  COALESCE(mp_line."menuTypeSnapshot", mp_order."menuTypeSnapshot", op."menuTypeSnapshot"),
  ops."serviceDate",
  ops."slotType",
  opsc."menuPublicationSlotComponentId",
  COALESCE(opsc."sourceCatalogItemId", mpsc."sourceCatalogItemId"),
  opsc."componentRole",
  opsc."nombre",
  opsc."descripcion",
  opsc."tipo";

CREATE VIEW "vw_publication_shopping_requirements" WITH (security_invoker = true) AS
WITH slot_assignments AS (
  SELECT
    ops."menuPublicationSlotId",
    ops."orderDeliveryId",
    ops."menuTypeSnapshot",
    COUNT(*)::INTEGER AS assigned_slot_count
  FROM "OrderPlanSlot" ops
  JOIN "OrderPlan" op ON op."id" = ops."orderPlanId"
  JOIN "Order" o ON o."id" = op."orderId"
  WHERE COALESCE(op."menuPublicationId", o."menuPublicationId") IS NOT NULL
    AND ops."menuPublicationSlotId" IS NOT NULL
  GROUP BY ops."menuPublicationSlotId", ops."orderDeliveryId", ops."menuTypeSnapshot"
)
SELECT
  mps."menuPublicationId" AS menu_publication_id,
  mp."menuTypeSnapshot" AS menu_type,
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
JOIN "MenuPublication" mp ON mp."id" = mps."menuPublicationId"
JOIN "MenuPublicationSlotComponent" mpsc ON mpsc."menuPublicationSlotId" = mps."id"
JOIN "MenuPublicationSlotIngredient" mpsi ON mpsi."menuPublicationSlotComponentId" = mpsc."id"
LEFT JOIN "OrderDelivery" od ON od."id" = sa."orderDeliveryId"
GROUP BY
  mps."menuPublicationId",
  mp."menuTypeSnapshot",
  mps."serviceDate",
  od."id",
  od."deliveryIndex",
  od."scheduledFor",
  mpsi."sourceSupplyItemId",
  mpsi."supplyNameSnapshot",
  mpsi."supplyUnitBaseSnapshot",
  mpsi."supplyCategoryNameSnapshot";

CREATE VIEW "vw_order_delivery_manifest" WITH (security_invoker = true) AS
SELECT
  od."id" AS order_delivery_id,
  od."orderId" AS order_id,
  o."orderNumber" AS order_number,
  o."menuPublicationId" AS menu_publication_id,
  mp."menuTypeSnapshot" AS primary_menu_type,
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
  COALESCE(slot_stats.menu_types, ARRAY[]::"MenuType"[]) AS menu_types,
  COALESCE(plan_stats.requested_dish_count, 0) AS requested_dish_count,
  COALESCE(plan_stats.resolved_dish_count, 0) AS resolved_dish_count
FROM "OrderDelivery" od
JOIN "Order" o ON o."id" = od."orderId"
JOIN "User" u ON u."id" = o."userId"
LEFT JOIN "MenuPublication" mp ON mp."id" = o."menuPublicationId"
LEFT JOIN "OrderAddressSnapshot" oas ON oas."orderId" = o."id"
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::INTEGER AS assigned_slot_count,
    ARRAY_AGG(DISTINCT ops."menuTypeSnapshot") AS menu_types
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
