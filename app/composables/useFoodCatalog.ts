import type { FoodCatalogItem, FoodCatalogItemInput } from '~~/types/types'

export function useFoodCatalog() {
  async function saveFoodCatalogItem(payload: FoodCatalogItemInput, id?: string) {
    try {
      return await $fetch<FoodCatalogItem>(id ? `/api/food-components/${id}` : '/api/food-components', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo guardar el platillo.'))
    }
  }

  async function deleteFoodCatalogItem(id: string) {
    return await $fetch<{ id: string }>(`/api/food-components/${id}`, {
      method: 'DELETE'
    })
  }

  return {
    saveFoodCatalogItem,
    deleteFoodCatalogItem
  }
}
