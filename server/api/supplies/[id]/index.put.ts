import { createError } from 'h3'

import type { SupplyItemInput } from '~~/types/types'

import { updateSupplyItem } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de insumo inválido.' })
  }

  const body = await readBody<SupplyItemInput>(event)
  return updateSupplyItem(id, body)
})
