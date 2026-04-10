import { getAllMenus } from '../../utils/menu'

export default defineEventHandler(async () => {
  return getAllMenus()
})
