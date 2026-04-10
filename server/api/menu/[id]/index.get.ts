import { createError } from 'h3'

import { getMenuById } from '../../../utils/menu'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de menú inválido.' })
  }

  const menu = await getMenuById(id)

  if (!menu) {
    throw createError({ statusCode: 404, statusMessage: 'Menú no encontrado.' })
  }

  return menu
})
