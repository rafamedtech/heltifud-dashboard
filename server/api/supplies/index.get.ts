import { getSupplyItems } from '~~/server/utils/foodCatalog'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)

  return getSupplyItems({
    includeInactive: query.includeInactive === 'true' || query.includeInactive === '1'
  })
})
