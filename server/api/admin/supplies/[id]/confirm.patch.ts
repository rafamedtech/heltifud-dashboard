import { createError } from 'h3'
import { NutritionSupplyAdminService } from '~~/server/services/nutrition/NutritionSupplyAdminService'
import { parseConfirmSupplyBody } from '~~/server/utils/validation/nutritionAdmin'

const nutritionSupplyAdminService = new NutritionSupplyAdminService()

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de insumo inválido.' })
  }

  const input = await parseConfirmSupplyBody(event)
  return nutritionSupplyAdminService.confirmSupply(id, input)
})
