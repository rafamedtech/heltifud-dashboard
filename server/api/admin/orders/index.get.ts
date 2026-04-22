import { getAdminOrders } from '~~/server/utils/orders'

export default defineEventHandler(async () => {
  return getAdminOrders()
})
