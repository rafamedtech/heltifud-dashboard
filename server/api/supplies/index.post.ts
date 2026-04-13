import type { SupplyItemInput } from '~~/types/types'

import { createSupplyItem } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const body = await readBody<SupplyItemInput>(event)
  return createSupplyItem(body)
})
