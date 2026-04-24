import { createError } from 'h3'

import { ComponentRole, SlotType, type Prisma, type DayOfWeek } from '../../prisma/generated/client/client'
import { MenuType, type MenuType as MenuTypeValue } from '../../prisma/generated/client/enums'
import { weeklyMenuInputSchema, type WeeklyMenuInputParsed } from '~~/types/menuSchema'
import type {
  DayMenu,
  DetailedDayMenu,
  DetailedFoodItem,
  DetailedMenuSlot,
  FoodItemDetail,
  MenuSlot,
  SlotKey,
  WeeklyMenuDetail,
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
const MENU_ACTIVE_LEAD_DAYS = 5
const MENU_BUSINESS_TIME_ZONE = 'America/Tijuana'

type MenuActivityRecord = {
  id: string
  menuType?: MenuTypeValue | string
  startDate: Date
  endDate: Date
  createdAt?: Date | null
  updatedAt?: Date | null
}

function trimString(value: string | undefined | null): string {
  return (value ?? '').trim()
}

function getDateKeyFromStoredDate(value: Date) {
  return value.toISOString().slice(0, 10)
}

function getCurrentDateKey(timeZone = MENU_BUSINESS_TIME_ZONE, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(now)

  const year = parts.find(part => part.type === 'year')?.value
  const month = parts.find(part => part.type === 'month')?.value
  const day = parts.find(part => part.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('No se pudo resolver la fecha actual para la zona horaria del menú.')
  }

  return `${year}-${month}-${day}`
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number)

  if (!year || !month || !day) {
    throw new Error(`Fecha inválida para menú: ${dateKey}`)
  }

  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function getActivationStartDateKey(menu: Pick<MenuActivityRecord, 'startDate'>) {
  return addDaysToDateKey(getDateKeyFromStoredDate(menu.startDate), -MENU_ACTIVE_LEAD_DAYS)
}

function isMenuActiveForDateKey(menu: Pick<MenuActivityRecord, 'startDate' | 'endDate'>, dateKey: string) {
  const activationStartKey = getActivationStartDateKey(menu)
  const endDateKey = getDateKeyFromStoredDate(menu.endDate)

  return activationStartKey <= dateKey && dateKey <= endDateKey
}

function compareMenuPriority(a: MenuActivityRecord, b: MenuActivityRecord) {
  const startDateDiff = b.startDate.getTime() - a.startDate.getTime()

  if (startDateDiff !== 0) {
    return startDateDiff
  }

  const updatedAtDiff = (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0)

  if (updatedAtDiff !== 0) {
    return updatedAtDiff
  }

  return (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
}

export function resolveActiveMenuIds(records: readonly MenuActivityRecord[], now = new Date()) {
  const todayKey = getCurrentDateKey(MENU_BUSINESS_TIME_ZONE, now)
  const byType = new Map<string, MenuActivityRecord>()
  const activeRecords = [...records]
    .filter(record => isMenuActiveForDateKey(record, todayKey))
    .sort(compareMenuPriority)

  activeRecords.forEach((record) => {
    const menuType = record.menuType ?? MenuType.ESTANDAR

    if (!byType.has(menuType)) {
      byType.set(menuType, record)
    }
  })

  return new Set([...byType.values()].map(record => record.id))
}

export function resolveActiveMenuId(records: readonly MenuActivityRecord[], now = new Date()) {
  return [...resolveActiveMenuIds(records, now)][0] ?? null
}

function resolveNextMenuId(records: readonly MenuActivityRecord[], now = new Date()) {
  const todayKey = getCurrentDateKey(MENU_BUSINESS_TIME_ZONE, now)

  return [...records]
    .filter(record => getActivationStartDateKey(record) > todayKey)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]?.id ?? null
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
      message: 'Guarniciones opcionales requieren nombre y tipo cuando se capturan.',
      data: {
        message: 'Guarniciones opcionales requieren nombre y tipo cuando se capturan.'
      }
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
      catalogItem: slot.platilloPrincipal.catalogItemId
        ? {
            connect: {
              id: slot.platilloPrincipal.catalogItemId
            }
          }
        : undefined,
      nombre: slot.platilloPrincipal.nombre,
      descripcion: slot.platilloPrincipal.descripcion,
      calorias: slot.platilloPrincipal.calorias,
      imagen: slot.platilloPrincipal.imagen,
      tipo: slot.platilloPrincipal.tipo
    })
  }

  if (slot.guarnicion1) {
    components.push({
      componentRole: ComponentRole.GUARNICION_1,
      catalogItem: slot.guarnicion1.catalogItemId
        ? {
            connect: {
              id: slot.guarnicion1.catalogItemId
            }
          }
        : undefined,
      nombre: slot.guarnicion1.nombre,
      descripcion: slot.guarnicion1.descripcion,
      calorias: slot.guarnicion1.calorias,
      imagen: slot.guarnicion1.imagen,
      tipo: slot.guarnicion1.tipo
    })
  }

  if (slot.guarnicion2) {
    components.push({
      componentRole: ComponentRole.GUARNICION_2,
      catalogItem: slot.guarnicion2.catalogItemId
        ? {
            connect: {
              id: slot.guarnicion2.catalogItemId
            }
          }
        : undefined,
      nombre: slot.guarnicion2.nombre,
      descripcion: slot.guarnicion2.descripcion,
      calorias: slot.guarnicion2.calorias,
      imagen: slot.guarnicion2.imagen,
      tipo: slot.guarnicion2.tipo
    })
  }

  slot.adicionales.forEach((adicional) => {
    components.push({
      componentRole: ComponentRole.ADICIONAL,
      catalogItem: adicional.catalogItemId
        ? {
            connect: {
              id: adicional.catalogItemId
            }
          }
        : undefined,
      nombre: adicional.nombre,
      descripcion: adicional.descripcion,
      calorias: adicional.calorias,
      imagen: adicional.imagen,
      tipo: adicional.tipo
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
  id: string
  catalogItemId: string | null
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
}): DetailedFoodItem {
  return {
    sourceFoodComponentId: item.id,
    catalogItemId: item.catalogItemId,
    nombre: item.nombre,
    descripcion: item.descripcion,
    calorias: item.calorias,
    imagen: item.imagen,
    tipo: item.tipo
  }
}

function mapSlot(record: WeeklyMenuRecord['days'][number]['slots'][number]): DetailedMenuSlot {
  const platilloPrincipal = record.components.find(item => item.componentRole === ComponentRole.PLATILLO_PRINCIPAL)

  const guarnicion1 = record.components.find(item => item.componentRole === ComponentRole.GUARNICION_1)
  const guarnicion2 = record.components.find(item => item.componentRole === ComponentRole.GUARNICION_2)
  const adicionales = record.components.filter(item => item.componentRole === ComponentRole.ADICIONAL)

  return {
    sourceDaySlotId: record.id,
    platilloPrincipal: platilloPrincipal ? mapFood(platilloPrincipal) : createEmptyFoodItem(),
    guarnicion1: guarnicion1 ? mapFood(guarnicion1) : null,
    guarnicion2: guarnicion2 ? mapFood(guarnicion2) : null,
    contenedor: record.contenedor,
    adicionales: adicionales.map(mapFood)
  }
}

function mapMenu(record: WeeklyMenuRecord, activeMenuIds: ReadonlySet<string>): WeeklyMenuDetail {
  return {
    id: record.id,
    name: record.name,
    isActive: activeMenuIds.has(record.id),
    menuType: record.menuType,
    startDate: record.startDate.toISOString(),
    endDate: record.endDate.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    days: record.days.map((day): DetailedDayMenu => {
      const byType = Object.fromEntries(
        day.slots.map(slot => [ENUM_TO_SLOT[slot.slotType], mapSlot(slot)])
      ) as Record<SlotKey, DetailedMenuSlot>

      return {
        sourceMenuDayId: day.id,
        menuDayOrder: day.order,
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
      message: 'Payload inválido para menú semanal.',
      data: {
        message: 'Payload inválido para menú semanal.',
        ...parsed.error.flatten()
      }
    })
  }

  return normalizePayload(parsed.data)
}

async function assertNoOverlap(startDate: Date, endDate: Date, menuType: MenuTypeValue, excludeId?: string) {
  const overlap = await prisma.weeklyMenu.findFirst({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      menuType,
      AND: [{ startDate: { lte: endDate } }, { endDate: { gte: startDate } }]
    },
    select: { id: true }
  })

  if (overlap) {
    throw createError({
      statusCode: 409,
      message: 'El rango de fechas del menú se traslapa con otro menú existente del mismo tipo.',
      data: {
        message: 'El rango de fechas del menú se traslapa con otro menú existente del mismo tipo.'
      }
    })
  }
}

export async function getActiveMenus() {
  const menus = await prisma.weeklyMenu.findMany({
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: menuInclude
  })

  const activeMenuIds = resolveActiveMenuIds(menus)

  return menus
    .filter(menu => activeMenuIds.has(menu.id))
    .map(menu => mapMenu(menu, activeMenuIds))
}

export async function getActiveMenu() {
  return (await getActiveMenus())[0] ?? null
}

export async function getNextMenu() {
  const menus = await prisma.weeklyMenu.findMany({
    orderBy: [{ startDate: 'asc' }, { createdAt: 'asc' }],
    include: menuInclude
  })

  const activeMenuIds = resolveActiveMenuIds(menus)
  const nextMenuId = resolveNextMenuId(menus)
  const menu = menus.find(item => item.id === nextMenuId)

  return menu ? mapMenu(menu, activeMenuIds) : null
}

export async function getAllMenus() {
  const menus = await prisma.weeklyMenu.findMany({
    orderBy: [{ startDate: 'desc' }, { createdAt: 'desc' }],
    include: menuInclude
  })

  const activeMenuIds = resolveActiveMenuIds(menus)

  return menus.map(menu => mapMenu(menu, activeMenuIds))
}

export async function getMenuById(id: string) {
  const [menu, menuActivityRecords] = await Promise.all([
    prisma.weeklyMenu.findUnique({
      where: { id },
      include: menuInclude
    }),
    prisma.weeklyMenu.findMany({
      select: {
        id: true,
        menuType: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        updatedAt: true
      }
    })
  ])

  if (!menu) {
    return null
  }

  const activeMenuIds = resolveActiveMenuIds(menuActivityRecords)

  return mapMenu(menu, activeMenuIds)
}

export async function createWeeklyMenu(input: WeeklyMenuInput) {
  const payload = validatePayload(input)

  await assertNoOverlap(payload.startDate, payload.endDate, payload.menuType)

  const created = await prisma.weeklyMenu.create({
    data: {
      name: payload.name,
      isActive: false,
      menuType: payload.menuType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      days: {
        create: buildDays(payload.days)
      }
    },
    include: menuInclude
  })

  const menuActivityRecords = await prisma.weeklyMenu.findMany({
    select: {
      id: true,
      menuType: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true
    }
  })

  const activeMenuIds = resolveActiveMenuIds(menuActivityRecords)

  return mapMenu(created, activeMenuIds)
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
  await assertNoOverlap(payload.startDate, payload.endDate, payload.menuType, id)

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
        menuType: payload.menuType,
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

  const menuActivityRecords = await prisma.weeklyMenu.findMany({
    select: {
      id: true,
      menuType: true,
      startDate: true,
      endDate: true,
      createdAt: true,
      updatedAt: true
    }
  })

  const activeMenuIds = resolveActiveMenuIds(menuActivityRecords)

  return mapMenu(updated, activeMenuIds)
}

export async function deleteWeeklyMenu(id: string) {
  const existing = await prisma.weeklyMenu.findUnique({
    where: { id },
    select: { id: true }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Menú no encontrado.' })
  }

  await prisma.weeklyMenu.delete({ where: { id } })

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

  throw createError({
    statusCode: 409,
    message: 'El menú activo se determina automáticamente según la fecha de inicio y fin.',
    data: {
      message: 'El menú activo se determina automáticamente según la fecha de inicio y fin.'
    }
  })
}
