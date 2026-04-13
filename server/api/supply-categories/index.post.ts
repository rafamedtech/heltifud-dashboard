import type { SupplyCategoryInput } from '~~/types/types'

import { createSupplyCategory } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const body = await readBody<SupplyCategoryInput>(event)
  return createSupplyCategory(body)
})
