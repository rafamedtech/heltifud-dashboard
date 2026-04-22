import { createError } from 'h3'

import { deletePlan } from '../../../utils/plans'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de plan inválido.' })
  }

  return deletePlan(id)
})
