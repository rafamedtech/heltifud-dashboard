import { createError } from 'h3'

import { deleteSupplyItem } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de insumo inválido.' })
  }

  return deleteSupplyItem(id)
})
