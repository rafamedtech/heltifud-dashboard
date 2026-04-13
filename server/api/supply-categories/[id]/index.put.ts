import { createError } from 'h3'

import type { SupplyCategoryInput } from '~~/types/types'

import { updateSupplyCategory } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de categoría inválido.' })
  }

  const body = await readBody<SupplyCategoryInput>(event)
  return updateSupplyCategory(id, body)
})
