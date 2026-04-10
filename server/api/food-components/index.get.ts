import { getFoodCatalogItems } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async () => {
  return getFoodCatalogItems()
})
