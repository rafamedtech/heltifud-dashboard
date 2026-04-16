import { NutritionLookupService } from '~~/server/services/nutrition/NutritionLookupService'
import { parseLookupNutritionBody } from '~~/server/utils/validation/nutritionAdmin'

const nutritionLookupService = new NutritionLookupService()

export default defineEventHandler(async (event) => {
  const input = await parseLookupNutritionBody(event)
  return nutritionLookupService.lookup(input)
})
