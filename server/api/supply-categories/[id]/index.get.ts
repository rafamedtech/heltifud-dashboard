import { createError } from 'h3'

import { getSupplyCategoryById } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de categoría inválido.' })
  }

  const category = await getSupplyCategoryById(id)

  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada.' })
  }

  return category
})
