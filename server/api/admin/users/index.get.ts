import { getAdminUsers } from '~~/server/utils/users'

export default defineEventHandler(async () => {
  return getAdminUsers()
})
