import { createError } from 'h3'

import type { FoodCatalogItemInput } from '~~/types/types'

import { updateFoodCatalogItem } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de FoodComponent inválido.' })
  }

  const body = await readBody<FoodCatalogItemInput>(event)
  return updateFoodCatalogItem(id, body)
})
