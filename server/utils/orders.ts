import { createError } from 'h3'

import { orderInputSchema } from '~~/types/menuSchema'
import type {
  AdminOrderFormData,
  AdminOrderFormMenuSummary,
  AdminOrderFormUserSummary,
  AdminOrderInput,
  AdminOrderSummary,
  OrderPaymentStatus,
  OrderPlanResolutionStatus,
  OrderStatus,
  PlanSummary,
  PlanType
} from '~~/types/types'
import {
  ComponentRole,
  SlotType,
  type Prisma
} from '../../prisma/generated/client/client'

import { resolveActiveMenuIds } from './menu'
import { prisma } from './prisma'

type DecimalLike = { toNumber: () => number } | number | null | undefined

type OrderActorRecord = {
  id: string
  email: string
  nombre: string
  apellidos: string
  telefono?: string | null
}

type DeliveryAddressRecord = {
  etiqueta: string
  destinatario: string
  linea1: string
  linea2: string
  colonia: string
  ciudad: string
  estado: string
  codigoPostal: string
} | null

type WeeklyMenuRecord = {
  id: string
  name: string
  startDate: Date
  endDate: Date
} | null

type OrderPlanRecord = {
  id: string
  quantity: number
  unitPrice: DecimalLike
  lineSubtotal: DecimalLike
  planDishCountSnapshot: number
  planTypeSnapshot: PlanType
  requestedDishCount: number
  assignedDishCount: number
  pendingDishCount: number
  resolutionStatus: OrderPlanResolutionStatus
  plan: {
    id: string
    nombre: string
  }
}

type AdminOrderRecord = {
  id: string
  createdAt: Date
  updatedAt: Date
  orderNumber: string | null
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  currency: string
  subtotal: DecimalLike
  descuento: DecimalLike
  extras: DecimalLike
  costoEnvio: DecimalLike
  total: DecimalLike
  totalPlanPriceCached: DecimalLike
  totalDishCountCached: number
  requiredBagCountCached: number | null
  scheduledFor: Date | null
  firstDeliveryAt: Date | null
  secondDeliveryAt: Date | null
  deliveredAt: Date | null
  cancelledAt: Date | null
  tags: string[]
  notas: string
  notasInternas: string
  menuNameSnapshot: string
  menuStartDateSnapshot: Date | null
  menuEndDateSnapshot: Date | null
  menuResolvedAt: Date | null
  totalRequestedDishCount: number
  totalAssignedDishCount: number
  totalPendingDishCount: number
  user: OrderActorRecord
  createdBy: OrderActorRecord
  weeklyMenu: WeeklyMenuRecord
  deliveryAddress: DeliveryAddressRecord
  planItems: OrderPlanRecord[]
}

type FormAddressRecord = {
  id: string
  etiqueta: string
  destinatario: string
  telefono: string
  linea1: string
  linea2: string
  colonia: string
  ciudad: string
  estado: string
  codigoPostal: string
  referencias: string
  isDefault: boolean
}

type FormUserRecord = {
  id: string
  email: string
  nombre: string
  apellidos: string
  telefono: string | null
  customerType: AdminOrderFormUserSummary['customerType']
  primaryAddress: string
  primaryAddress2: string
  addresses: FormAddressRecord[]
}

type FormMenuRecord = {
  id: string
  name: string
  menuType: AdminOrderFormMenuSummary['menuType']
  isActive: boolean
  startDate: Date
  endDate: Date
}

type PlanRecord = {
  id: string
  nombre: string
  slug: string | null
  precio: DecimalLike
  dishCount: number
  tipo: PlanType
  tags: string[]
  isActive: boolean
  notas: string
  createdAt: Date
  updatedAt: Date
}

const PLAN_TYPE_TO_SLOT: Record<PlanType, SlotType> = {
  DESAYUNO: SlotType.DESAYUNO,
  COMIDA: SlotType.COMIDA,
  CENA: SlotType.CENA
}

function toNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber()
  }

  return Number(value)
}

function trimString(value: string | null | undefined) {
  return (value ?? '').trim()
}

function normalizeResolvedFoodItem(item: {
  sourceFoodComponentId?: string | null
  catalogItemId?: string | null
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
}) {
  return {
    sourceFoodComponentId: item.sourceFoodComponentId ?? null,
    sourceCatalogItemId: item.catalogItemId ?? null,
    nombre: trimString(item.nombre),
    descripcion: trimString(item.descripcion),
    calorias: item.calorias,
    imagen: trimString(item.imagen),
    tipo: trimString(item.tipo)
  }
}

function normalizeOptionalResolvedFoodItem(item: {
  sourceFoodComponentId?: string | null
  catalogItemId?: string | null
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
} | null | undefined) {
  if (!item) {
    return null
  }

  return normalizeResolvedFoodItem(item)
}

function normalizeTags(tags: string[] | undefined) {
  const unique = new Set<string>()

  for (const tag of tags ?? []) {
    const trimmed = trimString(tag)

    if (trimmed) {
      unique.add(trimmed)
    }
  }

  return Array.from(unique)
}

function compactJoin(parts: Array<string | null | undefined>, separator = ' · ') {
  return parts
    .map(value => trimString(value))
    .filter(Boolean)
    .join(separator)
}

function mapAddressSummary(address: DeliveryAddressRecord) {
  if (!address) {
    return null
  }

  const headline = compactJoin([address.etiqueta, address.destinatario], ' · ')
  const location = compactJoin([
    address.linea1,
    address.linea2,
    address.colonia,
    `${trimString(address.ciudad)}${address.estado ? `, ${trimString(address.estado)}` : ''}`,
    address.codigoPostal
  ], ', ')

  return compactJoin([headline, location])
}

function mapFormAddressSummary(address: FormAddressRecord) {
  return compactJoin([
    compactJoin([address.etiqueta, address.destinatario], ' · '),
    compactJoin([
      address.linea1,
      address.linea2,
      address.colonia,
      `${trimString(address.ciudad)}${address.estado ? `, ${trimString(address.estado)}` : ''}`,
      address.codigoPostal
    ], ', ')
  ])
}

function mapOrderActor(actor: OrderActorRecord) {
  return {
    id: actor.id,
    email: actor.email,
    nombre: actor.nombre,
    apellidos: actor.apellidos,
    telefono: actor.telefono ?? null
  }
}

function mapOrder(order: AdminOrderRecord): AdminOrderSummary {
  return {
    id: order.id,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    currency: order.currency,
    subtotal: toNumber(order.subtotal),
    descuento: toNumber(order.descuento),
    extras: toNumber(order.extras),
    costoEnvio: toNumber(order.costoEnvio),
    total: toNumber(order.total),
    totalPlanPriceCached: toNumber(order.totalPlanPriceCached),
    totalDishCountCached: order.totalDishCountCached,
    requiredBagCountCached: order.requiredBagCountCached,
    scheduledFor: order.scheduledFor?.toISOString() ?? null,
    firstDeliveryAt: order.firstDeliveryAt?.toISOString() ?? null,
    secondDeliveryAt: order.secondDeliveryAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    tags: order.tags,
    notas: order.notas,
    notasInternas: order.notasInternas,
    menuNameSnapshot: order.menuNameSnapshot,
    menuStartDateSnapshot: order.menuStartDateSnapshot?.toISOString() ?? null,
    menuEndDateSnapshot: order.menuEndDateSnapshot?.toISOString() ?? null,
    menuResolvedAt: order.menuResolvedAt?.toISOString() ?? null,
    totalRequestedDishCount: order.totalRequestedDishCount,
    totalAssignedDishCount: order.totalAssignedDishCount,
    totalPendingDishCount: order.totalPendingDishCount,
    deliveryAddressSummary: mapAddressSummary(order.deliveryAddress),
    user: mapOrderActor(order.user),
    createdBy: mapOrderActor(order.createdBy),
    weeklyMenu: order.weeklyMenu
      ? {
          id: order.weeklyMenu.id,
          name: order.weeklyMenu.name,
          startDate: order.weeklyMenu.startDate.toISOString(),
          endDate: order.weeklyMenu.endDate.toISOString()
        }
      : null,
    planItems: order.planItems.map(planItem => ({
      id: planItem.id,
      planId: planItem.plan.id,
      planName: planItem.plan.nombre,
      quantity: planItem.quantity,
      unitPrice: toNumber(planItem.unitPrice),
      lineSubtotal: toNumber(planItem.lineSubtotal),
      planDishCountSnapshot: planItem.planDishCountSnapshot,
      planTypeSnapshot: planItem.planTypeSnapshot,
      requestedDishCount: planItem.requestedDishCount,
      assignedDishCount: planItem.assignedDishCount,
      pendingDishCount: planItem.pendingDishCount,
      resolutionStatus: planItem.resolutionStatus
    }))
  }
}

function mapFormUser(user: FormUserRecord): AdminOrderFormUserSummary {
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    apellidos: user.apellidos,
    telefono: user.telefono,
    customerType: user.customerType,
    primaryAddress: user.primaryAddress,
    primaryAddress2: user.primaryAddress2,
    addresses: user.addresses.map(address => ({
      id: address.id,
      etiqueta: address.etiqueta,
      destinatario: address.destinatario,
      telefono: address.telefono,
      linea1: address.linea1,
      linea2: address.linea2,
      colonia: address.colonia,
      ciudad: address.ciudad,
      estado: address.estado,
      codigoPostal: address.codigoPostal,
      referencias: address.referencias,
      isDefault: address.isDefault,
      summary: mapFormAddressSummary(address)
    }))
  }
}

function mapFormMenu(menu: FormMenuRecord, activeMenuIds: ReadonlySet<string>): AdminOrderFormMenuSummary {
  return {
    id: menu.id,
    name: menu.name,
    menuType: menu.menuType,
    isActive: activeMenuIds.has(menu.id),
    startDate: menu.startDate.toISOString(),
    endDate: menu.endDate.toISOString()
  }
}

function mapPlanSummary(plan: PlanRecord): PlanSummary {
  return {
    id: plan.id,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    nombre: plan.nombre,
    slug: plan.slug,
    precio: toNumber(plan.precio) ?? 0,
    dishCount: plan.dishCount,
    tipo: plan.tipo,
    tags: plan.tags,
    isActive: plan.isActive,
    notas: plan.notas,
    ordersCount: 0
  }
}

function toNullableDate(value: string | Date | null | undefined) {
  if (!value) {
    return null
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    throw createError({
      statusCode: 400,
      message: 'Una de las fechas del pedido no es válida.',
      data: {
        message: 'Una de las fechas del pedido no es válida.'
      }
    })
  }

  return date
}

function calculateResolutionStatus(assignedDishCount: number, requestedDishCount: number): OrderPlanResolutionStatus {
  if (requestedDishCount <= 0 || assignedDishCount <= 0) {
    return 'PENDIENTE'
  }

  if (assignedDishCount >= requestedDishCount) {
    return 'COMPLETO'
  }

  return 'PARCIAL'
}

function generateOrderNumber() {
  const now = new Date()
  const dateStamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('')

  return `HF-${dateStamp}-${globalThis.crypto.randomUUID().slice(0, 6).toUpperCase()}`
}

function validateOrderInput(input: AdminOrderInput) {
  const parsed = orderInputSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Payload inválido para pedido.',
      data: {
        message: 'Payload inválido para pedido.',
        ...parsed.error.flatten()
      }
    })
  }

  return {
    userId: parsed.data.userId,
    weeklyMenuId: parsed.data.weeklyMenuId ?? null,
    deliveryAddressId: parsed.data.deliveryAddressId ?? null,
    deliveryAddress: parsed.data.deliveryAddress
      ? {
          etiqueta: trimString(parsed.data.deliveryAddress.etiqueta),
          destinatario: trimString(parsed.data.deliveryAddress.destinatario),
          telefono: trimString(parsed.data.deliveryAddress.telefono),
          linea1: trimString(parsed.data.deliveryAddress.linea1),
          linea2: trimString(parsed.data.deliveryAddress.linea2),
          colonia: trimString(parsed.data.deliveryAddress.colonia),
          ciudad: trimString(parsed.data.deliveryAddress.ciudad),
          estado: trimString(parsed.data.deliveryAddress.estado),
          codigoPostal: trimString(parsed.data.deliveryAddress.codigoPostal),
          pais: trimString(parsed.data.deliveryAddress.pais) || 'MX',
          referencias: trimString(parsed.data.deliveryAddress.referencias),
          makeDefault: Boolean(parsed.data.deliveryAddress.makeDefault)
        }
      : null,
    status: parsed.data.status,
    paymentStatus: parsed.data.paymentStatus,
    currency: trimString(parsed.data.currency).toUpperCase(),
    descuento: parsed.data.descuento ?? null,
    extras: parsed.data.extras ?? null,
    costoEnvio: parsed.data.costoEnvio ?? null,
    scheduledFor: toNullableDate(parsed.data.scheduledFor),
    firstDeliveryAt: toNullableDate(parsed.data.firstDeliveryAt),
    secondDeliveryAt: toNullableDate(parsed.data.secondDeliveryAt),
    tags: normalizeTags(parsed.data.tags),
    notas: trimString(parsed.data.notas),
    notasInternas: trimString(parsed.data.notasInternas),
    planItems: parsed.data.planItems.map(item => ({
      planId: item.planId,
      quantity: item.quantity,
      notas: trimString(item.notas),
      slots: item.slots.map(slot => ({
        sourceWeeklyMenuId: slot.sourceWeeklyMenuId ?? parsed.data.weeklyMenuId ?? null,
        sourceMenuDayId: slot.sourceMenuDayId ?? null,
        sourceDaySlotId: slot.sourceDaySlotId ?? null,
        selectionIndex: slot.selectionIndex,
        dayOfWeek: slot.dayOfWeek,
        menuDayOrder: slot.menuDayOrder,
        slotType: slot.slotType,
        contenedor: trimString(slot.contenedor),
        platilloPrincipal: normalizeResolvedFoodItem(slot.platilloPrincipal),
        guarnicion1: normalizeOptionalResolvedFoodItem(slot.guarnicion1),
        guarnicion2: normalizeOptionalResolvedFoodItem(slot.guarnicion2),
        adicionales: slot.adicionales.map(adicional => normalizeResolvedFoodItem(adicional))
      }))
    }))
  }
}

function buildSubmittedSlotComponents(slot: ReturnType<typeof validateOrderInput>['planItems'][number]['slots'][number]) {
  const components: Prisma.OrderPlanSlotComponentCreateWithoutOrderPlanSlotInput[] = [
    {
      sourceFoodComponent: slot.platilloPrincipal.sourceFoodComponentId
        ? {
            connect: {
              id: slot.platilloPrincipal.sourceFoodComponentId
            }
          }
        : undefined,
      sourceCatalogItem: slot.platilloPrincipal.sourceCatalogItemId
        ? {
            connect: {
              id: slot.platilloPrincipal.sourceCatalogItemId
            }
          }
        : undefined,
      componentRole: ComponentRole.PLATILLO_PRINCIPAL,
      nombre: slot.platilloPrincipal.nombre,
      descripcion: slot.platilloPrincipal.descripcion,
      calorias: slot.platilloPrincipal.calorias,
      imagen: slot.platilloPrincipal.imagen,
      tipo: slot.platilloPrincipal.tipo
    }
  ]

  if (slot.guarnicion1) {
    components.push({
      sourceFoodComponent: slot.guarnicion1.sourceFoodComponentId
        ? {
            connect: {
              id: slot.guarnicion1.sourceFoodComponentId
            }
          }
        : undefined,
      sourceCatalogItem: slot.guarnicion1.sourceCatalogItemId
        ? {
            connect: {
              id: slot.guarnicion1.sourceCatalogItemId
            }
          }
        : undefined,
      componentRole: ComponentRole.GUARNICION_1,
      nombre: slot.guarnicion1.nombre,
      descripcion: slot.guarnicion1.descripcion,
      calorias: slot.guarnicion1.calorias,
      imagen: slot.guarnicion1.imagen,
      tipo: slot.guarnicion1.tipo
    })
  }

  if (slot.guarnicion2) {
    components.push({
      sourceFoodComponent: slot.guarnicion2.sourceFoodComponentId
        ? {
            connect: {
              id: slot.guarnicion2.sourceFoodComponentId
            }
          }
        : undefined,
      sourceCatalogItem: slot.guarnicion2.sourceCatalogItemId
        ? {
            connect: {
              id: slot.guarnicion2.sourceCatalogItemId
            }
          }
        : undefined,
      componentRole: ComponentRole.GUARNICION_2,
      nombre: slot.guarnicion2.nombre,
      descripcion: slot.guarnicion2.descripcion,
      calorias: slot.guarnicion2.calorias,
      imagen: slot.guarnicion2.imagen,
      tipo: slot.guarnicion2.tipo
    })
  }

  slot.adicionales.forEach((adicional) => {
    components.push({
      sourceFoodComponent: adicional.sourceFoodComponentId
        ? {
            connect: {
              id: adicional.sourceFoodComponentId
            }
          }
        : undefined,
      sourceCatalogItem: adicional.sourceCatalogItemId
        ? {
            connect: {
              id: adicional.sourceCatalogItemId
            }
          }
        : undefined,
      componentRole: ComponentRole.ADICIONAL,
      nombre: adicional.nombre,
      descripcion: adicional.descripcion,
      calorias: adicional.calorias,
      imagen: adicional.imagen,
      tipo: adicional.tipo
    })
  })

  return components
}

function buildSubmittedSlots(
  slots: ReturnType<typeof validateOrderInput>['planItems'][number]['slots']
) {
  return [...slots]
    .sort((left, right) => left.selectionIndex - right.selectionIndex)
    .map<Prisma.OrderPlanSlotCreateWithoutOrderPlanInput>(slot => ({
      sourceWeeklyMenu: slot.sourceWeeklyMenuId
        ? {
            connect: {
              id: slot.sourceWeeklyMenuId
            }
          }
        : undefined,
      sourceMenuDay: slot.sourceMenuDayId
        ? {
            connect: {
              id: slot.sourceMenuDayId
            }
          }
        : undefined,
      sourceDaySlot: slot.sourceDaySlotId
        ? {
            connect: {
              id: slot.sourceDaySlotId
            }
          }
        : undefined,
      selectionIndex: slot.selectionIndex,
      dayOfWeek: slot.dayOfWeek,
      menuDayOrder: slot.menuDayOrder,
      slotType: slot.slotType,
      contenedor: slot.contenedor,
      components: {
        create: buildSubmittedSlotComponents(slot)
      }
    }))
}

async function resolveDeliveryAddressId(
  tx: Prisma.TransactionClient,
  userId: string,
  deliveryAddressId: string | null,
  deliveryAddress: ReturnType<typeof validateOrderInput>['deliveryAddress']
) {
  if (deliveryAddressId) {
    const existing = await tx.userAddress.findFirst({
      where: {
        id: deliveryAddressId,
        userId
      },
      select: {
        id: true
      }
    })

    if (!existing) {
      throw createError({
        statusCode: 404,
        message: 'La dirección seleccionada no pertenece al cliente.',
        data: {
          message: 'La dirección seleccionada no pertenece al cliente.'
        }
      })
    }

    return existing.id
  }

  if (!deliveryAddress) {
    return null
  }

  const addressCount = await tx.userAddress.count({
    where: {
      userId
    }
  })

  const shouldBeDefault = deliveryAddress.makeDefault || addressCount === 0

  if (shouldBeDefault) {
    await tx.userAddress.updateMany({
      where: {
        userId,
        isDefault: true
      },
      data: {
        isDefault: false
      }
    })
  }

  const created = await tx.userAddress.create({
    data: {
      userId,
      etiqueta: deliveryAddress.etiqueta,
      destinatario: deliveryAddress.destinatario,
      telefono: deliveryAddress.telefono,
      linea1: deliveryAddress.linea1,
      linea2: deliveryAddress.linea2,
      colonia: deliveryAddress.colonia,
      ciudad: deliveryAddress.ciudad,
      estado: deliveryAddress.estado,
      codigoPostal: deliveryAddress.codigoPostal,
      pais: deliveryAddress.pais,
      referencias: deliveryAddress.referencias,
      isDefault: shouldBeDefault
    },
    select: {
      id: true
    }
  })

  return created.id
}

async function refreshUserOrderCaches(tx: Prisma.TransactionClient, userId: string) {
  const [ordersCountCached, lastOrder, totalSpent] = await Promise.all([
    tx.order.count({
      where: {
        userId
      }
    }),
    tx.order.findFirst({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        createdAt: true
      }
    }),
    tx.order.aggregate({
      where: {
        userId,
        status: {
          not: 'CANCELADO'
        }
      },
      _sum: {
        total: true
      }
    })
  ])

  await tx.user.update({
    where: {
      id: userId
    },
    data: {
      ordersCountCached,
      lastOrderAt: lastOrder?.createdAt ?? null,
      totalSpentCached: totalSpent._sum.total ?? null
    }
  })
}

const adminOrderSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  orderNumber: true,
  status: true,
  paymentStatus: true,
  currency: true,
  subtotal: true,
  descuento: true,
  extras: true,
  costoEnvio: true,
  total: true,
  totalPlanPriceCached: true,
  totalDishCountCached: true,
  requiredBagCountCached: true,
  scheduledFor: true,
  firstDeliveryAt: true,
  secondDeliveryAt: true,
  deliveredAt: true,
  cancelledAt: true,
  tags: true,
  notas: true,
  notasInternas: true,
  menuNameSnapshot: true,
  menuStartDateSnapshot: true,
  menuEndDateSnapshot: true,
  menuResolvedAt: true,
  totalRequestedDishCount: true,
  totalAssignedDishCount: true,
  totalPendingDishCount: true,
  user: {
    select: {
      id: true,
      email: true,
      nombre: true,
      apellidos: true,
      telefono: true
    }
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      nombre: true,
      apellidos: true
    }
  },
  weeklyMenu: {
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true
    }
  },
  deliveryAddress: {
    select: {
      etiqueta: true,
      destinatario: true,
      linea1: true,
      linea2: true,
      colonia: true,
      ciudad: true,
      estado: true,
      codigoPostal: true
    }
  },
  planItems: {
    orderBy: [
      { planTypeSnapshot: 'asc' },
      { createdAt: 'asc' }
    ],
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      lineSubtotal: true,
      planDishCountSnapshot: true,
      planTypeSnapshot: true,
      requestedDishCount: true,
      assignedDishCount: true,
      pendingDishCount: true,
      resolutionStatus: true,
      plan: {
        select: {
          id: true,
          nombre: true
        }
      }
    }
  }
} satisfies Prisma.OrderSelect

export async function getAdminOrders() {
  const orders = await prisma.order.findMany({
    orderBy: [
      { scheduledFor: 'asc' },
      { firstDeliveryAt: 'asc' },
      { createdAt: 'desc' }
    ],
    select: adminOrderSelect
  })

  return orders.map(order => mapOrder(order as unknown as AdminOrderRecord))
}

export async function getAdminOrderFormData(): Promise<AdminOrderFormData> {
  const [users, plans, menus] = await Promise.all([
    prisma.user.findMany({
      orderBy: [
        { nombre: 'asc' },
        { apellidos: 'asc' },
        { email: 'asc' }
      ],
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        telefono: true,
        customerType: true,
        primaryAddress: true,
        primaryAddress2: true,
        addresses: {
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'asc' }
          ],
          select: {
            id: true,
            etiqueta: true,
            destinatario: true,
            telefono: true,
            linea1: true,
            linea2: true,
            colonia: true,
            ciudad: true,
            estado: true,
            codigoPostal: true,
            referencias: true,
            isDefault: true
          }
        }
      }
    }),
    prisma.plan.findMany({
      orderBy: [
        { isActive: 'desc' },
        { tipo: 'asc' },
        { nombre: 'asc' }
      ],
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        nombre: true,
        slug: true,
        precio: true,
        dishCount: true,
        tipo: true,
        tags: true,
        isActive: true,
        notas: true
      }
    }),
    prisma.weeklyMenu.findMany({
      orderBy: [{ startDate: 'desc' }],
      select: {
        id: true,
        name: true,
        menuType: true,
        isActive: true,
        startDate: true,
        endDate: true
      }
    })
  ])

  const activeMenuIds = resolveActiveMenuIds(menus)
  const normalizedMenus = menus
    .map(menu => mapFormMenu(menu as FormMenuRecord, activeMenuIds))
    .sort((a, b) => Number(b.isActive) - Number(a.isActive) || new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

  return {
    users: users.map(user => mapFormUser(user as FormUserRecord)),
    plans: plans.map(plan => mapPlanSummary(plan as PlanRecord)),
    menus: normalizedMenus
  }
}

export async function createAdminOrder(input: AdminOrderInput, createdById: string) {
  const payload = validateOrderInput(input)

  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId
    },
    select: {
      id: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Cliente no encontrado.',
      data: {
        message: 'Cliente no encontrado.'
      }
    })
  }

  const createdBy = await prisma.user.findUnique({
    where: {
      id: createdById
    },
    select: {
      id: true
    }
  })

  if (!createdBy) {
    throw createError({
      statusCode: 404,
      message: 'No se encontró al usuario que está creando el pedido.',
      data: {
        message: 'No se encontró al usuario que está creando el pedido.'
      }
    })
  }

  const planIds = payload.planItems.map(item => item.planId)
  const plans = await prisma.plan.findMany({
    where: {
      id: {
        in: planIds
      }
    },
    select: {
      id: true,
      nombre: true,
      precio: true,
      dishCount: true,
      tipo: true
    }
  })

  if (plans.length !== planIds.length) {
    throw createError({
      statusCode: 404,
      message: 'Uno o más planes seleccionados ya no existen.',
      data: {
        message: 'Uno o más planes seleccionados ya no existen.'
      }
    })
  }

  const planMap = new Map(plans.map(plan => [plan.id, plan]))
  const weeklyMenu = payload.weeklyMenuId
    ? await prisma.weeklyMenu.findUnique({
        where: {
          id: payload.weeklyMenuId
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
          days: {
            orderBy: {
              order: 'asc'
            },
            select: {
              id: true,
              dayOfWeek: true,
              order: true,
              slots: {
                select: {
                  id: true,
                  slotType: true,
                  contenedor: true,
                  components: {
                    select: {
                      id: true,
                      catalogItemId: true,
                      componentRole: true,
                      nombre: true,
                      descripcion: true,
                      calorias: true,
                      imagen: true,
                      tipo: true
                    }
                  }
                }
              }
            }
          }
        }
      })
    : null

  if (payload.weeklyMenuId && !weeklyMenu) {
    throw createError({
      statusCode: 404,
      message: 'El menú seleccionado ya no existe.',
      data: {
        message: 'El menú seleccionado ya no existe.'
      }
    })
  }

  const totalPlanPriceCached = payload.planItems.reduce((sum, item) => {
    const plan = planMap.get(item.planId)
    const unitPrice = toNumber(plan?.precio) ?? 0

    return sum + (unitPrice * item.quantity)
  }, 0)

  const descuento = payload.descuento ?? 0
  const extras = payload.extras ?? 0
  const costoEnvio = payload.costoEnvio ?? 0
  const subtotal = totalPlanPriceCached
  const total = Math.max(0, subtotal - descuento + extras + costoEnvio)
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const resolvedDeliveryAddressId = await resolveDeliveryAddressId(
      tx,
      payload.userId,
      payload.deliveryAddressId,
      payload.deliveryAddress
    )

    let totalRequestedDishCount = 0
    let totalAssignedDishCount = 0
    let totalPendingDishCount = 0

    const planItemsCreate: Prisma.OrderPlanCreateWithoutOrderInput[] = payload.planItems.map((item) => {
      const plan = planMap.get(item.planId)

      if (!plan) {
        throw createError({
          statusCode: 404,
          message: 'Uno de los planes seleccionados ya no está disponible.',
          data: {
            message: 'Uno de los planes seleccionados ya no está disponible.'
          }
        })
      }

      const requestedDishCount = plan.dishCount * item.quantity
      const expectedSlotType = PLAN_TYPE_TO_SLOT[plan.tipo]
      const hasInvalidSlotType = item.slots.some(slot => slot.slotType !== expectedSlotType)

      if (hasInvalidSlotType) {
        throw createError({
          statusCode: 400,
          message: 'Uno de los slots enviados no corresponde al tipo de plan seleccionado.',
          data: {
            message: 'Uno de los slots enviados no corresponde al tipo de plan seleccionado.'
          }
        })
      }

      const slotsCreate = buildSubmittedSlots(item.slots)
      const assignedDishCount = slotsCreate.length
      const pendingDishCount = Math.max(requestedDishCount - assignedDishCount, 0)
      const resolutionStatus = calculateResolutionStatus(assignedDishCount, requestedDishCount)
      const unitPrice = toNumber(plan.precio) ?? 0
      const lineSubtotal = unitPrice * item.quantity

      totalRequestedDishCount += requestedDishCount
      totalAssignedDishCount += assignedDishCount
      totalPendingDishCount += pendingDishCount

      return {
        plan: {
          connect: {
            id: plan.id
          }
        },
        quantity: item.quantity,
        unitPrice,
        lineSubtotal,
        notas: item.notas,
        planDishCountSnapshot: plan.dishCount,
        planTypeSnapshot: plan.tipo,
        requestedDishCount,
        assignedDishCount,
        pendingDishCount,
        resolutionStatus,
        slots: slotsCreate.length
          ? {
              create: slotsCreate
            }
          : undefined
      }
    })

    const created = await tx.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        user: {
          connect: {
            id: payload.userId
          }
        },
        createdBy: {
          connect: {
            id: createdById
          }
        },
        weeklyMenu: weeklyMenu
          ? {
              connect: {
                id: weeklyMenu.id
              }
            }
          : undefined,
        deliveryAddress: resolvedDeliveryAddressId
          ? {
              connect: {
                id: resolvedDeliveryAddressId
              }
            }
          : undefined,
        status: payload.status,
        paymentStatus: payload.paymentStatus,
        currency: payload.currency,
        subtotal,
        descuento: payload.descuento,
        extras: payload.extras,
        costoEnvio: payload.costoEnvio,
        total,
        totalPlanPriceCached,
        totalDishCountCached: totalRequestedDishCount,
        requiredBagCountCached: payload.planItems.reduce((sum, item) => sum + item.quantity, 0),
        scheduledFor: payload.scheduledFor,
        firstDeliveryAt: payload.firstDeliveryAt,
        secondDeliveryAt: payload.secondDeliveryAt,
        tags: payload.tags,
        notas: payload.notas,
        notasInternas: payload.notasInternas,
        menuNameSnapshot: weeklyMenu?.name ?? '',
        menuStartDateSnapshot: weeklyMenu?.startDate ?? null,
        menuEndDateSnapshot: weeklyMenu?.endDate ?? null,
        menuResolvedAt: weeklyMenu ? now : null,
        totalRequestedDishCount,
        totalAssignedDishCount,
        totalPendingDishCount,
        planItems: {
          create: planItemsCreate
        }
      },
      select: adminOrderSelect
    })

    await refreshUserOrderCaches(tx, payload.userId)

    return mapOrder(created as unknown as AdminOrderRecord)
  })
}
