import { createError } from 'h3'
import { RecipeNutritionCalculator } from '~~/server/services/nutrition/RecipeNutritionCalculator'

const recipeNutritionCalculator = new RecipeNutritionCalculator()

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'ID de receta inválido.' })
  }

  return recipeNutritionCalculator.calculateAndCache(id)
})
