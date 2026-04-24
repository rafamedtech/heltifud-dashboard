import type { SupplyCategoryInput, SupplyCategorySummary } from '~~/types/types'

export function useSupplyCategories() {
  async function saveSupplyCategory(payload: SupplyCategoryInput, id?: string) {
    try {
      return await $fetch<SupplyCategorySummary>(id ? `/api/supply-categories/${id}` : '/api/supply-categories', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo guardar la categoría.'))
    }
  }

  async function deleteSupplyCategory(id: string) {
    try {
      return await $fetch<{ id: string }>(`/api/supply-categories/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo eliminar la categoría.'))
    }
  }

  return {
    saveSupplyCategory,
    deleteSupplyCategory
  }
}
