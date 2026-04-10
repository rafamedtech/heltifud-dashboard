import { createError } from 'h3'

import { ComponentRole, SlotType, type Prisma, type DayOfWeek } from '../../prisma/generated/client/client'
import { weeklyMenuInputSchema, type WeeklyMenuInputParsed } from '~~/types/menuSchema'
import type {
  DayMenu,
  FoodItemDetail,
  MenuSlot,
  SlotKey,
  WeeklyMenu,
  WeeklyMenuInput
} from '~~/types/types'

import { prisma } from './prisma'

const DAY_ORDER: Record<DayOfWeek, number> = {
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
  DOMINGO: 7
}

const SLOT_TO_ENUM: Record<SlotKey, SlotType> = {
  desayuno: SlotType.DESAYUNO,
  comida: SlotType.COMIDA,
  cena: SlotType.CENA,
  snack1: SlotType.SNACK1,
  snack2: SlotType.SNACK2
}

const ENUM_TO_SLOT: Record<SlotType, SlotKey> = {
  [SlotType.DESAYUNO]: 'desayuno',
  [SlotType.COMIDA]: 'comida',
  [SlotType.CENA]: 'cena',
  [SlotType.SNACK1]: 'snack1',
  [SlotType.SNACK2]: 'snack2'
}

const menuInclude = {
  days: {
    orderBy: { order: 'asc' as const },
    select: {
      dayOfWeek: true,
      slots: {
        select: {
          slotType: true,
          contenedor: true,
          components: {
            select: {
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

type WeeklyMenuRecord = Prisma.WeeklyMenuGetPayload<{
  include: typeof menuInclude
}>

type OptionalFoodItemInput = {
  catalogItemId?: string | null
  nombre?: string
  descripcion?: string
  calorias?: number
  imagen?: string
  tipo?: string
} | null

const SLOT_KEYS: SlotKey[] = ['desayuno', 'comida', 'cena', 'snack1', 'snack2']

function trimString(value: string | undefined | null): string {
  return (value ?? '').trim()
}

function normalizeFoodItem(item: FoodItemDetail): FoodItemDetail {
  return {
    catalogItemId: item.catalogItemId ?? null,
    nombre: trimString(item.nombre),
    descripcion: trimString(item.descripcion),
    calorias: item.calorias,
    imagen: trimString(item.imagen),
    tipo: trimString(item.tipo)
  }
}

function isFoodItemFilled(item?: FoodItemDetail | null) {
  if (!item) {
    return false
  }

  return Boolean(
    trimString(item.nombre)
    || trimString(item.descripcion)
    || trimString(item.imagen)
    || trimString(item.tipo)
    || item.calorias > 0
  )
}

function createEmptyFoodItem(): FoodItemDetail {
  return {
    catalogItemId: null,
    nombre: '',
    descripcion: '',
    calorias: 0,
    imagen: '',
    tipo: ''
  }
}

function createEmptySlot(): MenuSlot {
  return {
    platilloPrincipal: createEmptyFoodItem(),
    guarnicion1: null,
    guarnicion2: null,
    contenedor: '',
    adicionales: []
  }
}

function normalizeOptionalFoodItem(item: OptionalFoodItemInput): FoodItemDetail | null {
  if (!item) {
    return null
  }

  const normalized: FoodItemDetail = {
    catalogItemId: item.catalogItemId ?? null,
    nombre: trimString(item.nombre),
    descripcion: trimString(item.descripcion),
    calorias: item.calorias ?? 0,
    imagen: trimString(item.imagen),
    tipo: trimString(item.tipo)
  }

  const hasAnyValue
    = normalized.nombre.length > 0
      || normalized.descripcion.length > 0
      || normalized.imagen.length > 0
      || normalized.tipo.length > 0
      || normalized.calorias > 0

  if (!hasAnyValue) {
    return null
  }

  if (!normalized.nombre || !normalized.tipo) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Guarniciones opcionales requieren nombre y tipo cuando se capturan.'
    })
  }

  return normalized
}

function normalizePayload(payload: WeeklyMenuInputParsed): WeeklyMenuInputParsed {
  const days = payload.days.map((day) => {
    const normalizedDay: DayMenu = {
      dayOfWeek: day.dayOfWeek,
      desayuno: normalizeSlot(day.desayuno),
      comida: normalizeSlot(day.comida),
      cena: normalizeSlot(day.cena),
      snack1: normalizeSlot(day.snack1),
      snack2: normalizeSlot(day.snack2)
    }

    return normalizedDay
  })

  return {
    ...payload,
    name: trimString(payload.name),
    days
  }
}

function normalizeSlot(slot: MenuSlot): MenuSlot {
  const platilloPrincipal = isFoodItemFilled(slot.platilloPrincipal)
    ? normalizeFoodItem(slot.platilloPrincipal)
    : createEmptyFoodItem()

  return {
    platilloPrincipal,
    guarnicion1: normalizeOptionalFoodItem(slot.guarnicion1 as OptionalFoodItemInput),
    guarnicion2: normalizeOptionalFoodItem(slot.guarnicion2 as OptionalFoodItemInput),
    contenedor: trimString(slot.contenedor ?? ''),
    adicionales: slot.adicionales.map(item => normalizeFoodItem(item))
  }
}

function buildComponents(slot: MenuSlot): Prisma.FoodComponentCreateWithoutDaySlotInput[] {
  const components: Prisma.FoodComponentCreateWithoutDaySlotInput[] = []

  if (isFoodItemFilled(slot.platilloPrincipal)) {
    components.push({
      componentRole: ComponentRole.PLATILLO_PRINCIPAL,
      ...slot.platilloPrincipal
    })
  }

  if (slot.guarnicion1) {
    components.push({
      componentRole: ComponentRole.GUARNICION_1,
      ...slot.guarnicion1
    })
  }

  if (slot.guarnicion2) {
    components.push({
      componentRole: ComponentRole.GUARNICION_2,
      ...slot.guarnicion2
    })
  }

  slot.adicionales.forEach((adicional) => {
    components.push({
      componentRole: ComponentRole.ADICIONAL,
      ...adicional
    })
  })

  return components
}

function buildDays(days: WeeklyMenuInputParsed['days']): Prisma.MenuDayCreateWithoutWeeklyMenuInput[] {
  return days.map(day => ({
    dayOfWeek: day.dayOfWeek,
    order: DAY_ORDER[day.dayOfWeek],
    slots: {
      create: SLOT_KEYS.map(slotKey => ({
        slotType: SLOT_TO_ENUM[slotKey],
        contenedor: day[slotKey].contenedor || null,
        components: {
          create: buildComponents(day[slotKey])
        }
      }))
    }
  }))
}

function mapFood(item: {
  catalogItemId: string | null
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
}): FoodItemDetail {
  return {
    catalogItemId: item.catalogItemId,
    nombre: item.nombre,
    descripcion: item.descripcion,
    calorias: item.calorias,
    imagen: item.imagen,
    tipo: item.tipo
  }
}

function mapSlot(record: WeeklyMenuRecord['days'][number]['slots'][number]): MenuSlot {
  const platilloPrincipal = record.components.find(item => item.componentRole === ComponentRole.PLATILLO_PRINCIPAL)

  const guarnicion1 = record.components.find(item => item.componentRole === ComponentRole.GUARNICION_1)
  const guarnicion2 = record.components.find(item => item.componentRole === ComponentRole.GUARNICION_2)
  const adicionales = record.components.filter(item => item.componentRole === ComponentRole.ADICIONAL)

  return {
    platilloPrincipal: platilloPrincipal ? mapFood(platilloPrincipal) : createEmptyFoodItem(),
    guarnicion1: guarnicion1 ? mapFood(guarnicion1) : null,
    guarnicion2: guarnicion2 ? mapFood(guarnicion2) : null,
    contenedor: record.contenedor,
    adicionales: adicionales.map(mapFood)
  }
}

function mapMenu(record: WeeklyMenuRecord): WeeklyMenu {
  return {
    id: record.id,
    name: record.name,
    isActive: record.isActive,
    startDate: record.startDate.toISOString(),
    endDate: record.endDate.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    days: record.days.map((day) => {
      const byType = Object.fromEntries(
        day.slots.map(slot => [ENUM_TO_SLOT[slot.slotType], mapSlot(slot)])
      ) as Record<SlotKey, MenuSlot>

      return {
        dayOfWeek: day.dayOfWeek,
        desayuno: byType.desayuno ?? createEmptySlot(),
        comida: byType.comida ?? createEmptySlot(),
        cena: byType.cena ?? createEmptySlot(),
        snack1: byType.snack1 ?? createEmptySlot(),
        snack2: byType.snack2 ?? createEmptySlot()
      }
    })
  }
}

function validatePayload(input: WeeklyMenuInput) {
  const parsed = weeklyMenuInputSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payload inválido para menú semanal.',
      data: parsed.error.flatten()
    })
  }

  return normalizePayload(parsed.data)
}

async function assertNoOverlap(startDate: Date, endDate: Date, excludeId?: string) {
  const overlap = await prisma.weeklyMenu.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }]
    },
    select: { id: true }
  })

  if (overlap) {
    throw createError({
      statusCode: 409,
      statusMessage: 'El rango de fechas del menú se traslapa con otro menú existente.'
    })
  }
}

export async function getActiveMenu() {
  const menu = await prisma.weeklyMenu.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: 'desc' },
    include: menuInclude
  })

  return menu ? mapMenu(menu) : null
}

export async function getNextMenu() {
  const now = new Date()

  const menu = await prisma.weeklyMenu.findFirst({
    where: {
      startDate: { gt: now }
    },
    orderBy: { startDate: 'asc' },
    include: menuInclude
  })

  return menu ? mapMenu(menu) : null
}

export async function getAllMenus() {
  const menus = await prisma.weeklyMenu.findMany({
    orderBy: { startDate: 'desc' },
    include: menuInclude
  })

  return menus.map(mapMenu)
}

export async function getMenuById(id: string) {
  const menu = await prisma.weeklyMenu.findUnique({
    where: { id },
    include: menuInclude
  })

  if (!menu) {
    return null
  }

  return mapMenu(menu)
}

export async function createWeeklyMenu(input: WeeklyMenuInput) {
  const payload = validatePayload(input)

  await assertNoOverlap(payload.startDate, payload.endDate)

  const hasActiveMenu = await prisma.weeklyMenu.count({
    where: { isActive: true }
  })

  const created = await prisma.weeklyMenu.create({
    data: {
      name: payload.name,
      isActive: hasActiveMenu === 0,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days: {
        create: buildDays(payload.days)
      }
    },
    include: menuInclude
  })

  return mapMenu(created)
}

export async function updateWeeklyMenu(id: string, input: WeeklyMenuInput) {
  const existing = await prisma.weeklyMenu.findUnique({
    where: { id },
    select: { id: true }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Menú no encontrado.' })
  }

  const payload = validatePayload(input)
  await assertNoOverlap(payload.startDate, payload.endDate, id)

  const existingDays = await prisma.menuDay.findMany({
    where: { weeklyMenuId: id },
    select: { id: true }
  })

  const menuDayIds = existingDays.map(day => day.id)

  const existingSlots = menuDayIds.length
    ? await prisma.daySlot.findMany({
        where: { menuDayId: { in: menuDayIds } },
        select: { id: true }
      })
    : []

  const daySlotIds = existingSlots.map(slot => slot.id)

  const operations: Prisma.PrismaPromise<unknown>[] = [
    prisma.weeklyMenu.update({
      where: { id },
      data: {
        name: payload.name,
        startDate: payload.startDate,
        endDate: payload.endDate
      }
    })
  ]

  if (daySlotIds.length) {
    operations.push(
      prisma.foodComponent.deleteMany({
        where: { daySlotId: { in: daySlotIds } }
      }),
      prisma.daySlot.deleteMany({
        where: { id: { in: daySlotIds } }
      })
    )
  }

  if (menuDayIds.length) {
    operations.push(
      prisma.menuDay.deleteMany({
        where: { id: { in: menuDayIds } }
      })
    )
  }

  operations.push(
    prisma.weeklyMenu.update({
      where: { id },
      data: {
        days: {
          create: buildDays(payload.days)
        }
      },
      include: menuInclude
    })
  )

  const results = await prisma.$transaction(operations)
  const updated = results[results.length - 1] as WeeklyMenuRecord

  return mapMenu(updated)
}

export async function deleteWeeklyMenu(id: string) {
  const existing = await prisma.weeklyMenu.findUnique({
    where: { id },
    select: { id: true, isActive: true }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Menú no encontrado.' })
  }

  await prisma.weeklyMenu.delete({ where: { id } })

  if (existing.isActive) {
    const fallbackMenu = await prisma.weeklyMenu.findFirst({
      orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }]
    })

    if (fallbackMenu) {
      await prisma.weeklyMenu.update({
        where: { id: fallbackMenu.id },
        data: { isActive: true }
      })
    }
  }

  return { id }
}

export async function setActiveMenu(id: string) {
  const existing = await prisma.weeklyMenu.findUnique({
    where: { id },
    select: { id: true }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Menú no encontrado.' })
  }

  await prisma.$transaction([
    prisma.weeklyMenu.updateMany({
      where: { isActive: true },
      data: { isActive: false }
    }),
    prisma.weeklyMenu.update({
      where: { id },
      data: { isActive: true }
    })
  ])

  const activeMenu = await prisma.weeklyMenu.findUnique({
    where: { id },
    include: menuInclude
  })

  if (!activeMenu) {
    throw createError({ statusCode: 404, statusMessage: 'Menú no encontrado.' })
  }

  return mapMenu(activeMenu)
}
