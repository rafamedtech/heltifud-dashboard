import { requireAuthenticatedSessionUser } from '~~/server/utils/session'

export default defineEventHandler(async (event) => {
  return requireAuthenticatedSessionUser(event)
})
