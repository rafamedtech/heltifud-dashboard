import type { AdminUserInput } from '~~/types/types'

import { createAdminUser } from '~~/server/utils/users'

export default defineEventHandler(async (event) => {
  const body = await readBody<AdminUserInput>(event)
  return createAdminUser(body)
})
