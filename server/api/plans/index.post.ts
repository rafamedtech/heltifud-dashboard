import type { PlanInput } from '~~/types/types'

import { createPlan } from '../../utils/plans'

export default defineEventHandler(async (event) => {
  const body = await readBody<PlanInput>(event)
  return createPlan(body)
})
