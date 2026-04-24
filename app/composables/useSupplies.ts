import type { SupplyItemInput, SupplyItemSummary } from '~~/types/types'

export function useSupplies() {
  async function saveSupply(payload: SupplyItemInput, id?: string) {
    try {
      return await $fetch<SupplyItemSummary>(id ? `/api/supplies/${id}` : '/api/supplies', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo guardar el insumo.'))
    }
  }

  async function deleteSupply(id: string) {
    try {
      return await $fetch<{ id: string }>(`/api/supplies/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo eliminar el insumo.'))
    }
  }

  return {
    saveSupply,
    deleteSupply
  }
}
