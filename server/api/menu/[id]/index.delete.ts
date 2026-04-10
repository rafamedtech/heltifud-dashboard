import { createError } from 'h3'

import { deleteWeeklyMenu } from '../../../utils/menu'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de menú inválido.' })
  }

  return deleteWeeklyMenu(id)
})
