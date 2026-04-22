import { createError } from 'h3'

import { getPlanById } from '../../../utils/plans'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de plan inválido.' })
  }

  const plan = await getPlanById(id)

  if (!plan) {
    throw createError({ statusCode: 404, statusMessage: 'Plan no encontrado.' })
  }

  return plan
})
