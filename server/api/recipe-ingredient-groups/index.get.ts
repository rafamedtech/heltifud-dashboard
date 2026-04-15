import { getRecipeIngredientGroups } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async () => {
  return getRecipeIngredientGroups()
})
