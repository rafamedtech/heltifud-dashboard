-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
    CREATE TYPE "UserRole" AS ENUM (
      'ADMIN',
      'CLIENTE'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM (
      'ACTIVO',
      'PAUSADO',
      'INACTIVO',
      'BLOQUEADO'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderStatus') THEN
    CREATE TYPE "OrderStatus" AS ENUM (
      'BORRADOR',
      'INGRESADO',
      'CONFIRMADO',
      'PAGADO',
      'EMPACADO',
      'EMPACADO_POR_PAGAR',
      'PROGRAMADO',
      'EN_RUTA',
      'ENTREGADO',
      'ENTREGADO_POR_PAGAR',
      'COMPLETADO',
      'COMPLETADO_POR_PAGAR',
      'CANCELADO'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OrderPaymentStatus') THEN
    CREATE TYPE "OrderPaymentStatus" AS ENUM (
      'PENDIENTE',
      'PAGADO',
      'FALLIDO',
      'REEMBOLSADO'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserSource') THEN
    CREATE TYPE "UserSource" AS ENUM (
      'ORGANICO',
      'ADS',
      'REFERIDO',
      'OTRO'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserGender') THEN
    CREATE TYPE "UserGender" AS ENUM (
      'MUJER',
      'HOMBRE',
      'OTRO',
      'PREFIERE_NO_DECIR'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserCustomerType') THEN
    CREATE TYPE "UserCustomerType" AS ENUM (
      'VEGETARIANO',
      'NUTRIOLOGO',
      'ESTANDAR'
    );
  END IF;
END
$$;

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlanType') THEN
    CREATE TYPE "PlanType" AS ENUM (
      'DESAYUNO',
      'COMIDA',
      'CENA'
    );
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "authUserId" TEXT,
  "email" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "apellidos" TEXT NOT NULL DEFAULT '',
  "telefono" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'CLIENTE',
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVO',
  "source" "UserSource",
  "gender" "UserGender",
  "customerType" "UserCustomerType",
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "primaryAddress" TEXT NOT NULL DEFAULT '',
  "primaryAddress2" TEXT NOT NULL DEFAULT '',
  "notas" TEXT NOT NULL DEFAULT '',
  "totalSpentCached" DECIMAL(10,2),
  "ordersCountCached" INTEGER NOT NULL DEFAULT 0,
  "lastOrderAt" TIMESTAMP(3),

  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserAddress" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "userId" TEXT NOT NULL,
  "etiqueta" TEXT NOT NULL DEFAULT '',
  "destinatario" TEXT NOT NULL DEFAULT '',
  "telefono" TEXT NOT NULL DEFAULT '',
  "linea1" TEXT NOT NULL,
  "linea2" TEXT NOT NULL DEFAULT '',
  "colonia" TEXT NOT NULL DEFAULT '',
  "ciudad" TEXT NOT NULL,
  "estado" TEXT NOT NULL,
  "codigoPostal" TEXT NOT NULL DEFAULT '',
  "pais" TEXT NOT NULL DEFAULT 'MX',
  "referencias" TEXT NOT NULL DEFAULT '',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "UserAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Plan" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "nombre" TEXT NOT NULL,
  "slug" TEXT,
  "precio" DECIMAL(10,2) NOT NULL,
  "dishCount" INTEGER NOT NULL DEFAULT 0,
  "tipo" "PlanType" NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notas" TEXT NOT NULL DEFAULT '',

  CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Order" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orderNumber" TEXT,
  "userId" TEXT NOT NULL,
  "createdById" TEXT NOT NULL,
  "weeklyMenuId" TEXT,
  "deliveryAddressId" TEXT,
  "status" "OrderStatus" NOT NULL DEFAULT 'BORRADOR',
  "paymentStatus" "OrderPaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
  "currency" TEXT NOT NULL DEFAULT 'MXN',
  "subtotal" DECIMAL(10,2),
  "descuento" DECIMAL(10,2),
  "extras" DECIMAL(10,2),
  "costoEnvio" DECIMAL(10,2),
  "total" DECIMAL(10,2),
  "totalPlanPriceCached" DECIMAL(10,2),
  "totalDishCountCached" INTEGER NOT NULL DEFAULT 0,
  "requiredBagCountCached" INTEGER,
  "scheduledFor" TIMESTAMP(3),
  "firstDeliveryAt" TIMESTAMP(3),
  "secondDeliveryAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "paymentReceiptUrl" TEXT,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "notas" TEXT NOT NULL DEFAULT '',
  "notasInternas" TEXT NOT NULL DEFAULT '',
  "menuNameSnapshot" TEXT NOT NULL DEFAULT '',
  "menuStartDateSnapshot" TIMESTAMP(3),
  "menuEndDateSnapshot" TIMESTAMP(3),

  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OrderPlan" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "orderId" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unitPrice" DECIMAL(10,2),
  "lineSubtotal" DECIMAL(10,2),
  "notas" TEXT NOT NULL DEFAULT '',

  CONSTRAINT "OrderPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_authUserId_key" ON "User"("authUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_role_status_idx" ON "User"("role", "status");
CREATE INDEX IF NOT EXISTS "User_source_status_idx" ON "User"("source", "status");
CREATE INDEX IF NOT EXISTS "User_customerType_status_idx" ON "User"("customerType", "status");
CREATE INDEX IF NOT EXISTS "User_nombre_apellidos_idx" ON "User"("nombre", "apellidos");

CREATE INDEX IF NOT EXISTS "UserAddress_userId_isDefault_idx" ON "UserAddress"("userId", "isDefault");
CREATE INDEX IF NOT EXISTS "UserAddress_ciudad_estado_idx" ON "UserAddress"("ciudad", "estado");

CREATE UNIQUE INDEX IF NOT EXISTS "Plan_slug_key" ON "Plan"("slug");
CREATE INDEX IF NOT EXISTS "Plan_tipo_isActive_idx" ON "Plan"("tipo", "isActive");
CREATE INDEX IF NOT EXISTS "Plan_nombre_idx" ON "Plan"("nombre");

CREATE UNIQUE INDEX IF NOT EXISTS "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX IF NOT EXISTS "Order_userId_status_createdAt_idx" ON "Order"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_createdById_createdAt_idx" ON "Order"("createdById", "createdAt");
CREATE INDEX IF NOT EXISTS "Order_weeklyMenuId_idx" ON "Order"("weeklyMenuId");
CREATE INDEX IF NOT EXISTS "Order_deliveryAddressId_idx" ON "Order"("deliveryAddressId");
CREATE INDEX IF NOT EXISTS "Order_scheduledFor_status_idx" ON "Order"("scheduledFor", "status");
CREATE INDEX IF NOT EXISTS "Order_firstDeliveryAt_secondDeliveryAt_idx" ON "Order"("firstDeliveryAt", "secondDeliveryAt");
CREATE INDEX IF NOT EXISTS "Order_paymentStatus_status_idx" ON "Order"("paymentStatus", "status");

CREATE UNIQUE INDEX IF NOT EXISTS "OrderPlan_orderId_planId_key" ON "OrderPlan"("orderId", "planId");
CREATE INDEX IF NOT EXISTS "OrderPlan_planId_idx" ON "OrderPlan"("planId");
CREATE INDEX IF NOT EXISTS "OrderPlan_orderId_quantity_idx" ON "OrderPlan"("orderId", "quantity");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'UserAddress_userId_fkey'
  ) THEN
    ALTER TABLE "UserAddress"
      ADD CONSTRAINT "UserAddress_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
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
    WHERE conname = 'Order_userId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE RESTRICT
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
    WHERE conname = 'Order_createdById_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_createdById_fkey"
      FOREIGN KEY ("createdById") REFERENCES "User"("id")
      ON DELETE RESTRICT
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
    WHERE conname = 'Order_weeklyMenuId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_weeklyMenuId_fkey"
      FOREIGN KEY ("weeklyMenuId") REFERENCES "WeeklyMenu"("id")
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
    WHERE conname = 'Order_deliveryAddressId_fkey'
  ) THEN
    ALTER TABLE "Order"
      ADD CONSTRAINT "Order_deliveryAddressId_fkey"
      FOREIGN KEY ("deliveryAddressId") REFERENCES "UserAddress"("id")
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
    WHERE conname = 'OrderPlan_orderId_fkey'
  ) THEN
    ALTER TABLE "OrderPlan"
      ADD CONSTRAINT "OrderPlan_orderId_fkey"
      FOREIGN KEY ("orderId") REFERENCES "Order"("id")
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
    WHERE conname = 'OrderPlan_planId_fkey'
  ) THEN
    ALTER TABLE "OrderPlan"
      ADD CONSTRAINT "OrderPlan_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "Plan"("id")
      ON DELETE RESTRICT
      ON UPDATE CASCADE;
  END IF;
END
$$;
