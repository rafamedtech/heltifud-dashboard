import type { FoodCatalogItemInput } from '~~/types/types'

import { createFoodCatalogItem } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const body = await readBody<FoodCatalogItemInput>(event)
  return createFoodCatalogItem(body)
})
