import type { WeeklyMenuInput } from '~~/types/types'

import { createWeeklyMenu } from '../../utils/menu'

export default defineEventHandler(async (event) => {
  const body = await readBody<WeeklyMenuInput>(event)
  return createWeeklyMenu(body)
})
