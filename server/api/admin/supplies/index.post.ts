import { NutritionSupplyAdminService } from '~~/server/services/nutrition/NutritionSupplyAdminService'
import { parseCreateAdminSupplyBody } from '~~/server/utils/validation/nutritionAdmin'

const nutritionSupplyAdminService = new NutritionSupplyAdminService()

export default defineEventHandler(async (event) => {
  const input = await parseCreateAdminSupplyBody(event)
  return nutritionSupplyAdminService.createSupply(input)
})
