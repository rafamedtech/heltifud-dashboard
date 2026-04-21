import { createError } from 'h3'

import type { AdminUserInput } from '~~/types/types'

import { updateAdminUser } from '~~/server/utils/users'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de usuario inválido.' })
  }

  const body = await readBody<AdminUserInput>(event)
  return updateAdminUser(id, body)
})
