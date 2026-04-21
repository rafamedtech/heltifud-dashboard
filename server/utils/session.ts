import { createError } from 'h3'
import { serverSupabaseUser } from '#supabase/server'

import type { SessionAppUser } from '~~/types/types'

import { prisma } from './prisma'

async function findSessionAppUserBySupabaseUser(user: {
  id?: string
  email?: string | null
}): Promise<SessionAppUser> {
  const appUser = await prisma.user.findFirst({
    where: {
      OR: [
        user.id ? { authUserId: user.id } : undefined,
        user.email ? { email: user.email } : undefined
      ].filter(Boolean) as Array<{ authUserId?: string, email?: string }>
    },
    select: {
      id: true,
      authUserId: true,
      email: true,
      role: true
    }
  })

  return {
    id: appUser?.id ?? null,
    authUserId: appUser?.authUserId ?? user.id ?? null,
    email: appUser?.email ?? user.email ?? '',
    role: appUser?.role ?? null,
    isAdmin: appUser?.role === 'ADMIN'
  }
}

export async function getSessionAppUser(event: Parameters<typeof serverSupabaseUser>[0]) {
  const user = await serverSupabaseUser(event).catch(() => null)

  if (!user) {
    return null
  }

  return findSessionAppUserBySupabaseUser({
    id: user.id,
    email: user.email
  })
}

export async function requireAuthenticatedSessionUser(event: Parameters<typeof serverSupabaseUser>[0]) {
  const user = await getSessionAppUser(event)

  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  return user
}

export async function requireAdminSessionUser(event: Parameters<typeof serverSupabaseUser>[0]) {
  const user = await requireAuthenticatedSessionUser(event)

  if (!user.isAdmin) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden'
    })
  }

  return user
}
