import { getAdminOrderFormData } from '~~/server/utils/orders'

export default defineEventHandler(async () => {
  return getAdminOrderFormData()
})
