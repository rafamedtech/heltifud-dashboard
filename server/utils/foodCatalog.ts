import { createError } from 'h3'

import { foodCatalogItemInputSchema } from '~~/types/menuSchema'
import type { FoodCatalogItem, FoodCatalogItemDetail, FoodCatalogItemInput } from '~~/types/types'

import { prisma } from './prisma'

function trimString(value: string | undefined | null): string {
  return (value ?? '').trim()
}

function mapCatalogItem(item: {
  id: string
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
  createdAt: Date
  updatedAt: Date
}): FoodCatalogItem {
  return {
    id: item.id,
    nombre: item.nombre,
    descripcion: item.descripcion,
    calorias: item.calorias,
    imagen: item.imagen,
    tipo: item.tipo,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  }
}

function validateInput(input: FoodCatalogItemInput) {
  const parsed = foodCatalogItemInputSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Payload inválido para FoodComponent.',
      data: parsed.error.flatten()
    })
  }

  return {
    nombre: trimString(parsed.data.nombre),
    descripcion: trimString(parsed.data.descripcion),
    calorias: parsed.data.calorias,
    imagen: trimString(parsed.data.imagen),
    tipo: trimString(parsed.data.tipo)
  }
}

export async function getFoodCatalogItems() {
  const items = await prisma.foodCatalogItem.findMany({
    orderBy: [{ tipo: 'asc' }, { nombre: 'asc' }]
  })

  return items.map(mapCatalogItem)
}

export async function getFoodCatalogItemById(id: string) {
  const item = await prisma.foodCatalogItem.findUnique({
    where: { id },
    include: {
      components: {
        where: { catalogItemId: id },
        select: {
          daySlot: {
            select: {
              menuDay: {
                select: {
                  weeklyMenu: {
                    select: {
                      id: true,
                      name: true
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })

  if (!item) {
    return null
  }

  const linkedMenusMap = new Map<string, { id: string, name: string }>()

  for (const component of item.components) {
    const menu = component.daySlot.menuDay.weeklyMenu
    linkedMenusMap.set(menu.id, menu)
  }

  const mappedItem: FoodCatalogItemDetail = {
    ...mapCatalogItem(item),
    linkedMenus: Array.from(linkedMenusMap.values())
  }

  return mappedItem
}

export async function createFoodCatalogItem(input: FoodCatalogItemInput) {
  const data = validateInput(input)

  const created = await prisma.foodCatalogItem.create({
    data
  })

  return mapCatalogItem(created)
}

export async function updateFoodCatalogItem(id: string, input: FoodCatalogItemInput) {
  const existing = await prisma.foodCatalogItem.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      descripcion: true,
      calorias: true,
      imagen: true,
      tipo: true
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'FoodComponent no encontrado.' })
  }

  const data = validateInput(input)

  const [updated] = await prisma.$transaction([
    prisma.foodCatalogItem.update({
      where: { id },
      data
    }),
    prisma.foodComponent.updateMany({
      where: {
        OR: [
          { catalogItemId: id },
          {
            catalogItemId: null,
            nombre: existing.nombre,
            descripcion: existing.descripcion,
            calorias: existing.calorias,
            imagen: existing.imagen,
            tipo: existing.tipo
          }
        ]
      },
      data: {
        ...data,
        catalogItemId: id
      }
    })
  ])

  return mapCatalogItem(updated)
}

export async function deleteFoodCatalogItem(id: string) {
  const existing = await prisma.foodCatalogItem.findUnique({
    where: { id },
    select: { id: true, nombre: true }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'FoodComponent no encontrado.' })
  }

  const linkedComponents = await prisma.foodComponent.findMany({
    where: { catalogItemId: id },
    select: {
      daySlot: {
        select: {
          menuDay: {
            select: {
              weeklyMenu: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      }
    }
  })

  if (linkedComponents.length > 0) {
    const linkedMenusMap = new Map<string, { id: string, name: string }>()

    for (const component of linkedComponents) {
      const menu = component.daySlot.menuDay.weeklyMenu
      linkedMenusMap.set(menu.id, menu)
    }

    const linkedMenus = Array.from(linkedMenusMap.values())

    throw createError({
      statusCode: 409,
      statusMessage: 'Este platillo no se puede borrar todavía porque aparece en uno o más menús.',
      data: {
        code: 'FOOD_CATALOG_ITEM_IN_USE',
        itemName: existing.nombre,
        linkedMenus: linkedMenus.map(menu => ({
          id: menu.id,
          name: menu.name
        }))
      }
    })
  }

  await prisma.foodCatalogItem.delete({
    where: { id }
  })

  return { id }
}
