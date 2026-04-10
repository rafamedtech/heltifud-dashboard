import { getNextMenu } from '../../utils/menu'

export default defineEventHandler(async () => {
  return await getNextMenu()
})
