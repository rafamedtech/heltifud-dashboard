import { createError } from 'h3'

import { getFoodCatalogItemById } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de FoodComponent inválido.' })
  }

  const item = await getFoodCatalogItemById(id)

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'FoodComponent no encontrado.' })
  }

  return item
})
