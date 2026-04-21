import { createError, getMethod, getRequestURL } from 'h3'

import { requireAdminSessionUser } from '~~/server/utils/session'
import { serverSupabaseUser } from '#supabase/server'

const publicMenuRoutes = new Set(['/api/menu', '/api/menu/next'])

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const method = getMethod(event)

  const isPublicMenuRoute = method === 'GET' && publicMenuRoutes.has(path)
  const isProtectedAdminRoute = path.startsWith('/api/admin/')
  const isProtectedMenuRoute = path === '/api/menu/all' || path.startsWith('/api/menu/')
  const isProtectedMenuMutation = path === '/api/menu' && method !== 'GET'
  const isProtectedFoodRoute = path.startsWith('/api/food-components')

  if (isPublicMenuRoute || !(isProtectedAdminRoute || isProtectedMenuRoute || isProtectedMenuMutation || isProtectedFoodRoute)) {
    return
  }

  if (isProtectedAdminRoute) {
    await requireAdminSessionUser(event)
    return
  }

  const user = await serverSupabaseUser(event).catch(() => null)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }
})
