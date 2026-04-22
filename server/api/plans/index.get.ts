import { getAllPlans } from '../../utils/plans'

export default defineEventHandler(async () => {
  return getAllPlans()
})
