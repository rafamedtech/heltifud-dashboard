import { createError } from 'h3'

import { getSupplyItemById } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de insumo inválido.' })
  }

  const item = await getSupplyItemById(id)

  if (!item) {
    throw createError({ statusCode: 404, statusMessage: 'Insumo no encontrado.' })
  }

  return item
})
