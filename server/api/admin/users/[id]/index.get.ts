import { createError } from 'h3'

import { getAdminUserById } from '~~/server/utils/users'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de usuario inválido.' })
  }

  const user = await getAdminUserById(id)

  if (!user) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado.' })
  }

  return user
})
