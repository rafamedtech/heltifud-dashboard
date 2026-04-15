import type { FoodCatalogItem, FoodCatalogItemInput } from '~~/types/types'

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const data = 'data' in error ? error.data : undefined
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message
    }

    const message = 'message' in error ? error.message : undefined
    if (typeof message === 'string' && message.length > 0) {
      return message
    }

    const statusMessage = 'statusMessage' in error ? error.statusMessage : undefined
    if (typeof statusMessage === 'string' && statusMessage.length > 0) {
      return statusMessage
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function useFoodCatalog() {
  async function saveFoodCatalogItem(payload: FoodCatalogItemInput, id?: string) {
    try {
      return await $fetch<FoodCatalogItem>(id ? `/api/food-components/${id}` : '/api/food-components', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getErrorMessage(error, 'No se pudo guardar el platillo.'))
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
