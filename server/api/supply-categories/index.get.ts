import { getSupplyCategories } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getSupplyCategories({
    includeInactive: query.includeInactive === 'true' || query.includeInactive === '1'
  })
})
