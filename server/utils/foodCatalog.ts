import { createError } from 'h3'

import { foodCatalogItemInputSchema, supplyCategoryInputSchema, supplyItemInputSchema } from '~~/types/menuSchema'
import type {
  FoodCatalogItem,
  FoodCatalogItemDetail,
  FoodCatalogItemInput,
  RecipeInput,
  SupplyCategoryInput,
  SupplyCategorySummary,
  SupplyItemInput,
  SupplyItemSummary
} from '~~/types/types'

import { prisma } from './prisma'

type CatalogItemRecord = {
  id: string
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
  createdAt: Date
  updatedAt: Date
}

function trimString(value: string | undefined | null): string {
  return (value ?? '').trim()
}

function trimNullableString(value: string | undefined | null): string | null {
  const trimmed = trimString(value)
  return trimmed.length > 0 ? trimmed : null
}

function toNumber(value: { toNumber: () => number } | number | null | undefined): number | null {
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

function normalizeTags(tags: string[] | undefined): string[] {
  const unique = new Set<string>()

  for (const tag of tags ?? []) {
    const trimmed = trimString(tag)
    if (trimmed) {
      unique.add(trimmed)
    }
  }

  return Array.from(unique)
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function recipeHasContent(recipe: RecipeInput | null | undefined) {
  if (!recipe) {
    return false
  }

  return Boolean(
    recipe.ingredients.length
    || recipe.instrucciones.trim()
    || recipe.notas.trim()
    || recipe.porciones
    || recipe.rendimientoCantidad
    || recipe.rendimientoUnidad
    || recipe.tiempoPreparacionMin
    || recipe.tiempoCoccionMin
  )
}

function mapCatalogItem(item: CatalogItemRecord): FoodCatalogItem {
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

function mapSupplyCategory(category: {
  id: string
  createdAt: Date
  updatedAt: Date
  nombre: string
  slug: string
  descripcion: string
  isActive: boolean
  sortOrder: number
}): SupplyCategorySummary {
  return {
    id: category.id,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
    nombre: category.nombre,
    slug: category.slug,
    descripcion: category.descripcion,
    isActive: category.isActive,
    sortOrder: category.sortOrder
  }
}

function mapSupplyItem(item: {
  id: string
  createdAt: Date
  updatedAt: Date
  nombre: string
  descripcion: string
  codigo: string | null
  unidadBase: string
  tags: string[]
  isActive: boolean
  costoReferencial: { toNumber: () => number } | number | null
  mermaPorcentaje: { toNumber: () => number } | number | null
  category: {
    id: string
    createdAt: Date
    updatedAt: Date
    nombre: string
    slug: string
    descripcion: string
    isActive: boolean
    sortOrder: number
  } | null
}): SupplyItemSummary {
  return {
    id: item.id,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    nombre: item.nombre,
    descripcion: item.descripcion,
    codigo: item.codigo,
    unidadBase: item.unidadBase as SupplyItemSummary['unidadBase'],
    tags: item.tags,
    isActive: item.isActive,
    costoReferencial: toNumber(item.costoReferencial),
    mermaPorcentaje: toNumber(item.mermaPorcentaje),
    category: item.category ? mapSupplyCategory(item.category) : null
  }
}

function validateInput(input: FoodCatalogItemInput) {
  const parsed = foodCatalogItemInputSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Payload inválido para platillo.',
      data: {
        message: 'Payload inválido para platillo.',
        ...parsed.error.flatten()
      }
    })
  }

  const normalizedRecipe = parsed.data.recipe
    ? {
        status: parsed.data.recipe.status ?? 'BORRADOR',
        porciones: parsed.data.recipe.porciones ?? null,
        rendimientoCantidad: parsed.data.recipe.rendimientoCantidad ?? null,
        rendimientoUnidad: parsed.data.recipe.rendimientoUnidad ?? null,
        tiempoPreparacionMin: parsed.data.recipe.tiempoPreparacionMin ?? null,
        tiempoCoccionMin: parsed.data.recipe.tiempoCoccionMin ?? null,
        instrucciones: trimString(parsed.data.recipe.instrucciones),
        notas: trimString(parsed.data.recipe.notas),
        ingredients: parsed.data.recipe.ingredients.map(ingredient => ({
          supplyName: trimString(ingredient.supplyName),
          supplyDescription: trimString(ingredient.supplyDescription),
          supplyCode: trimNullableString(ingredient.supplyCode),
          supplyUnitBase: ingredient.supplyUnitBase,
          supplyCategoryName: trimNullableString(ingredient.supplyCategoryName),
          supplyTags: normalizeTags(ingredient.supplyTags),
          supplyCostoReferencial: ingredient.supplyCostoReferencial ?? null,
          supplyMermaPorcentaje: ingredient.supplyMermaPorcentaje ?? null,
          grupo: trimNullableString(ingredient.grupo),
          cantidad: ingredient.cantidad,
          unidad: ingredient.unidad,
          notas: trimString(ingredient.notas),
          opcional: ingredient.opcional
        }))
      }
    : null

  for (const ingredient of normalizedRecipe?.ingredients ?? []) {
    if (!ingredient.supplyName) {
      throw createError({
        statusCode: 400,
        message: 'Cada ingrediente debe incluir un insumo.',
        data: {
          message: 'Cada ingrediente debe incluir un insumo.'
        }
      })
    }
  }

  return {
    nombre: trimString(parsed.data.nombre),
    descripcion: trimString(parsed.data.descripcion),
    calorias: parsed.data.calorias,
    imagen: trimString(parsed.data.imagen),
    tipo: trimString(parsed.data.tipo),
    recipe: recipeHasContent(normalizedRecipe) ? normalizedRecipe : null
  }
}

function validateSupplyCategoryInput(input: SupplyCategoryInput) {
  const parsed = supplyCategoryInputSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Payload inválido para categoría.',
      data: {
        message: 'Payload inválido para categoría.',
        ...parsed.error.flatten()
      }
    })
  }

  return {
    nombre: trimString(parsed.data.nombre),
    descripcion: trimString(parsed.data.descripcion),
    isActive: parsed.data.isActive,
    sortOrder: parsed.data.sortOrder
  }
}

function validateSupplyItemInput(input: SupplyItemInput) {
  const parsed = supplyItemInputSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Payload inválido para insumo.',
      data: {
        message: 'Payload inválido para insumo.',
        ...parsed.error.flatten()
      }
    })
  }

  return {
    nombre: trimString(parsed.data.nombre),
    descripcion: trimString(parsed.data.descripcion),
    codigo: trimNullableString(parsed.data.codigo),
    unidadBase: parsed.data.unidadBase,
    tags: normalizeTags(parsed.data.tags),
    isActive: parsed.data.isActive,
    costoReferencial: parsed.data.costoReferencial ?? null,
    mermaPorcentaje: parsed.data.mermaPorcentaje ?? null,
    categoryId: parsed.data.categoryId ?? null
  }
}

async function findOrCreateSupplyCategory(client: typeof prisma, categoryName: string | null) {
  if (!categoryName) {
    return null
  }

  const slug = slugify(categoryName)

  if (!slug) {
    return null
  }

  const existing = await client.supplyCategory.findUnique({
    where: { slug }
  })

  if (existing) {
    return existing
  }

  return await client.supplyCategory.create({
    data: {
      nombre: categoryName,
      slug,
      descripcion: ''
    }
  })
}

async function findOrCreateSupplyItem(
  client: typeof prisma,
  ingredient: NonNullable<ReturnType<typeof validateInput>['recipe']>['ingredients'][number]
) {
  const category = await findOrCreateSupplyCategory(client, ingredient.supplyCategoryName)
  const normalizedName = ingredient.supplyName

  const payload = {
    nombre: normalizedName,
    descripcion: ingredient.supplyDescription,
    codigo: ingredient.supplyCode,
    unidadBase: ingredient.supplyUnitBase,
    tags: ingredient.supplyTags,
    isActive: true,
    costoReferencial: ingredient.supplyCostoReferencial,
    mermaPorcentaje: ingredient.supplyMermaPorcentaje,
    categoryId: category?.id ?? null
  }

  const existing = ingredient.supplyCode
    ? await client.supplyItem.findUnique({
        where: { codigo: ingredient.supplyCode }
      })
    : await client.supplyItem.findFirst({
        where: {
          nombre: {
            equals: normalizedName,
            mode: 'insensitive'
          },
          unidadBase: ingredient.supplyUnitBase,
          categoryId: category?.id ?? null
        }
      })

  if (existing) {
    return await client.supplyItem.update({
      where: { id: existing.id },
      data: payload
    })
  }

  return await client.supplyItem.create({
    data: payload
  })
}

async function upsertRecipeForCatalogItem(
  client: typeof prisma,
  foodCatalogItemId: string,
  recipe: ReturnType<typeof validateInput>['recipe']
) {
  if (!recipe) {
    await client.recipe.deleteMany({
      where: { foodCatalogItemId }
    })
    return
  }

  const ingredients = []

  for (const [index, ingredient] of recipe.ingredients.entries()) {
    const supplyItem = await findOrCreateSupplyItem(client, ingredient)

    ingredients.push({
      supplyItemId: supplyItem.id,
      orden: index + 1,
      grupo: ingredient.grupo,
      cantidad: ingredient.cantidad,
      unidad: ingredient.unidad,
      notas: ingredient.notas,
      opcional: ingredient.opcional
    })
  }

  const existingRecipe = await client.recipe.findUnique({
    where: { foodCatalogItemId },
    select: { id: true }
  })

  const recipePayload = {
    status: recipe.status,
    porciones: recipe.porciones,
    rendimientoCantidad: recipe.rendimientoCantidad,
    rendimientoUnidad: recipe.rendimientoUnidad,
    tiempoPreparacionMin: recipe.tiempoPreparacionMin,
    tiempoCoccionMin: recipe.tiempoCoccionMin,
    instrucciones: recipe.instrucciones,
    notas: recipe.notas
  }

  if (existingRecipe) {
    await client.recipe.update({
      where: { id: existingRecipe.id },
      data: {
        ...recipePayload,
        version: {
          increment: 1
        },
        ingredients: {
          deleteMany: {},
          create: ingredients
        }
      }
    })
    return
  }

  await client.recipe.create({
    data: {
      ...recipePayload,
      foodCatalogItemId,
      ingredients: {
        create: ingredients
      }
    }
  })
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
      },
      recipe: {
        include: {
          ingredients: {
            orderBy: { orden: 'asc' },
            include: {
              supplyItem: {
                include: {
                  category: true
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
    linkedMenus: Array.from(linkedMenusMap.values()),
    recipe: item.recipe
      ? {
          id: item.recipe.id,
          status: item.recipe.status,
          version: item.recipe.version,
          porciones: item.recipe.porciones,
          rendimientoCantidad: toNumber(item.recipe.rendimientoCantidad),
          rendimientoUnidad: item.recipe.rendimientoUnidad,
          tiempoPreparacionMin: item.recipe.tiempoPreparacionMin,
          tiempoCoccionMin: item.recipe.tiempoCoccionMin,
          instrucciones: item.recipe.instrucciones,
          notas: item.recipe.notas,
          ingredients: item.recipe.ingredients.map(ingredient => ({
            id: ingredient.id,
            orden: ingredient.orden,
            grupo: ingredient.grupo,
            cantidad: toNumber(ingredient.cantidad) ?? 0,
            unidad: ingredient.unidad,
            notas: ingredient.notas,
            opcional: ingredient.opcional,
            supplyItem: mapSupplyItem(ingredient.supplyItem)
          }))
        }
      : null
  }

  return mappedItem
}

export async function getSupplyItems(options?: { includeInactive?: boolean }) {
  const items = await prisma.supplyItem.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    include: {
      category: true
    },
    orderBy: [{ isActive: 'desc' }, { nombre: 'asc' }]
  })

  return items.map(mapSupplyItem)
}

export async function getSupplyItemById(id: string) {
  const item = await prisma.supplyItem.findUnique({
    where: { id },
    include: {
      category: true
    }
  })

  return item ? mapSupplyItem(item) : null
}

export async function getSupplyCategories(options?: { includeInactive?: boolean }) {
  const categories = await prisma.supplyCategory.findMany({
    where: options?.includeInactive ? undefined : { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { nombre: 'asc' }]
  })

  return categories.map(mapSupplyCategory)
}

export async function getSupplyCategoryById(id: string) {
  const category = await prisma.supplyCategory.findUnique({
    where: { id }
  })

  return category ? mapSupplyCategory(category) : null
}

export async function getRecipeIngredientGroups() {
  const groups = await prisma.recipeIngredient.findMany({
    where: {
      grupo: {
        not: null
      }
    },
    select: {
      grupo: true
    },
    distinct: ['grupo'],
    orderBy: {
      grupo: 'asc'
    }
  })

  return groups
    .map(group => group.grupo?.trim() ?? '')
    .filter(Boolean)
}

export async function createSupplyCategory(input: SupplyCategoryInput) {
  const data = validateSupplyCategoryInput(input)
  const slug = slugify(data.nombre)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'La categoría necesita un nombre válido para generar el slug.',
      data: {
        message: 'La categoría necesita un nombre válido para generar el slug.'
      }
    })
  }

  const existing = await prisma.supplyCategory.findUnique({
    where: { slug }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe una categoría con ese nombre.',
      data: {
        message: 'Ya existe una categoría con ese nombre.'
      }
    })
  }

  const category = await prisma.supplyCategory.create({
    data: {
      ...data,
      slug
    }
  })

  return mapSupplyCategory(category)
}

export async function updateSupplyCategory(id: string, input: SupplyCategoryInput) {
  const existing = await prisma.supplyCategory.findUnique({
    where: { id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada.' })
  }

  const data = validateSupplyCategoryInput(input)
  const slug = slugify(data.nombre)

  if (!slug) {
    throw createError({
      statusCode: 400,
      message: 'La categoría necesita un nombre válido para generar el slug.',
      data: {
        message: 'La categoría necesita un nombre válido para generar el slug.'
      }
    })
  }

  const conflict = await prisma.supplyCategory.findUnique({
    where: { slug }
  })

  if (conflict && conflict.id !== id) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe una categoría con ese nombre.',
      data: {
        message: 'Ya existe una categoría con ese nombre.'
      }
    })
  }

  const category = await prisma.supplyCategory.update({
    where: { id },
    data: {
      ...data,
      slug
    }
  })

  return mapSupplyCategory(category)
}

export async function deleteSupplyCategory(id: string) {
  const existing = await prisma.supplyCategory.findUnique({
    where: { id },
    include: {
      supplies: {
        select: {
          id: true,
          nombre: true
        },
        orderBy: { nombre: 'asc' },
        take: 5
      },
      _count: {
        select: { supplies: true }
      }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada.' })
  }

  if (existing._count.supplies > 0) {
    throw createError({
      statusCode: 409,
      message: 'No se puede eliminar la categoría porque todavía tiene insumos asignados.',
      data: {
        message: 'No se puede eliminar la categoría porque todavía tiene insumos asignados.',
        code: 'SUPPLY_CATEGORY_IN_USE',
        supplyCount: existing._count.supplies,
        supplyNames: existing.supplies.map(supply => supply.nombre)
      }
    })
  }

  await prisma.supplyCategory.delete({
    where: { id }
  })

  return { id }
}

export async function createSupplyItem(input: SupplyItemInput) {
  const data = validateSupplyItemInput(input)

  if (data.categoryId) {
    const category = await prisma.supplyCategory.findUnique({
      where: { id: data.categoryId }
    })

    if (!category) {
      throw createError({
        statusCode: 400,
        message: 'La categoría seleccionada no existe.',
        data: {
          message: 'La categoría seleccionada no existe.'
        }
      })
    }
  }

  if (data.codigo) {
    const existingCode = await prisma.supplyItem.findUnique({
      where: { codigo: data.codigo }
    })

    if (existingCode) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un insumo con ese código.',
        data: {
          message: 'Ya existe un insumo con ese código.'
        }
      })
    }
  }

  const item = await prisma.supplyItem.create({
    data
  })

  return (await getSupplyItemById(item.id))!
}

export async function updateSupplyItem(id: string, input: SupplyItemInput) {
  const existing = await prisma.supplyItem.findUnique({
    where: { id }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Insumo no encontrado.' })
  }

  const data = validateSupplyItemInput(input)

  if (data.categoryId) {
    const category = await prisma.supplyCategory.findUnique({
      where: { id: data.categoryId }
    })

    if (!category) {
      throw createError({
        statusCode: 400,
        message: 'La categoría seleccionada no existe.',
        data: {
          message: 'La categoría seleccionada no existe.'
        }
      })
    }
  }

  if (data.codigo) {
    const existingCode = await prisma.supplyItem.findUnique({
      where: { codigo: data.codigo }
    })

    if (existingCode && existingCode.id !== id) {
      throw createError({
        statusCode: 409,
        message: 'Ya existe un insumo con ese código.',
        data: {
          message: 'Ya existe un insumo con ese código.'
        }
      })
    }
  }

  await prisma.supplyItem.update({
    where: { id },
    data
  })

  return (await getSupplyItemById(id))!
}

export async function deleteSupplyItem(id: string) {
  const existing = await prisma.supplyItem.findUnique({
    where: { id },
    include: {
      recipeItems: {
        select: {
          recipe: {
            select: {
              foodCatalogItem: {
                select: {
                  id: true,
                  nombre: true
                }
              }
            }
          }
        },
        take: 5
      },
      _count: {
        select: { recipeItems: true }
      }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Insumo no encontrado.' })
  }

  if (existing._count.recipeItems > 0) {
    throw createError({
      statusCode: 409,
      message: 'No se puede eliminar el insumo porque todavía se usa en recetas.',
      data: {
        message: 'No se puede eliminar el insumo porque todavía se usa en recetas.',
        code: 'SUPPLY_ITEM_IN_USE',
        recipeCount: existing._count.recipeItems,
        foodCatalogItems: existing.recipeItems.map(item => ({
          id: item.recipe.foodCatalogItem.id,
          nombre: item.recipe.foodCatalogItem.nombre
        }))
      }
    })
  }

  await prisma.supplyItem.delete({
    where: { id }
  })

  return { id }
}

export async function createFoodCatalogItem(input: FoodCatalogItemInput) {
  const data = validateInput(input)

  const created = await prisma.$transaction(async (tx) => {
    const createdItem = await tx.foodCatalogItem.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        calorias: data.calorias,
        imagen: data.imagen,
        tipo: data.tipo
      }
    })

    await upsertRecipeForCatalogItem(tx as typeof prisma, createdItem.id, data.recipe)

    return createdItem
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
    throw createError({ statusCode: 404, statusMessage: 'Platillo no encontrado.' })
  }

  const data = validateInput(input)

  const updated = await prisma.$transaction(async (tx) => {
    const updatedItem = await tx.foodCatalogItem.update({
      where: { id },
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        calorias: data.calorias,
        imagen: data.imagen,
        tipo: data.tipo
      }
    })

    await tx.foodComponent.updateMany({
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
        nombre: data.nombre,
        descripcion: data.descripcion,
        calorias: data.calorias,
        imagen: data.imagen,
        tipo: data.tipo,
        catalogItemId: id
      }
    })

    await upsertRecipeForCatalogItem(tx as typeof prisma, id, data.recipe)

    return updatedItem
  })

  return mapCatalogItem(updated)
}

export async function deleteFoodCatalogItem(id: string) {
  const existing = await prisma.foodCatalogItem.findUnique({
    where: { id },
    select: { id: true, nombre: true }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Platillo no encontrado.' })
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
      message: 'Este platillo no se puede borrar todavía porque aparece en uno o más menús.',
      data: {
        message: 'Este platillo no se puede borrar todavía porque aparece en uno o más menús.',
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
