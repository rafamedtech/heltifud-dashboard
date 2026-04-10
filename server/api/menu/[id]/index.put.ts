import { createError } from 'h3'

import type { WeeklyMenuInput } from '~~/types/types'

import { updateWeeklyMenu } from '../../../utils/menu'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de menú inválido.' })
  }

  const body = await readBody<WeeklyMenuInput>(event)
  return updateWeeklyMenu(id, body)
})
