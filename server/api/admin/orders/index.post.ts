import { createError } from 'h3'

import type { AdminOrderInput } from '~~/types/types'

import { requireAdminSessionUser } from '~~/server/utils/session'
import { createAdminOrder } from '~~/server/utils/orders'

export default defineEventHandler(async (event) => {
  const sessionUser = await requireAdminSessionUser(event)
  const body = await readBody<AdminOrderInput>(event)

  if (!sessionUser.id) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return createAdminOrder(body, sessionUser.id)
})
