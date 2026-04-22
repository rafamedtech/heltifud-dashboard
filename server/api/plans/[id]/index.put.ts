import { createError } from 'h3'

import type { PlanInput } from '~~/types/types'

import { updatePlan } from '../../../utils/plans'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de plan inválido.' })
  }

  const body = await readBody<PlanInput>(event)
  return updatePlan(id, body)
})
