import { getActiveMenu } from '../../utils/menu'

export default defineEventHandler(async () => {
  return await getActiveMenu()
})
