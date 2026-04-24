import { getActiveMenus } from '../../utils/menu'

export default defineEventHandler(async () => {
  return await getActiveMenus()
})
