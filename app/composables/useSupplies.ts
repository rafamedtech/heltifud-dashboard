import type { SupplyItemInput, SupplyItemSummary } from '~~/types/types'

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object') {
    const statusMessage = 'statusMessage' in error ? error.statusMessage : undefined
    if (typeof statusMessage === 'string' && statusMessage.length > 0) {
      return statusMessage
    }

    const data = 'data' in error ? error.data : undefined
    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function useSupplies() {
  async function saveSupply(payload: SupplyItemInput, id?: string) {
    try {
      return await $fetch<SupplyItemSummary>(id ? `/api/supplies/${id}` : '/api/supplies', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getErrorMessage(error, 'No se pudo guardar el insumo.'))
    }
  }

  async function deleteSupply(id: string) {
    try {
      return await $fetch<{ id: string }>(`/api/supplies/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      throw new Error(getErrorMessage(error, 'No se pudo eliminar el insumo.'))
    }
  }

  return {
    saveSupply,
    deleteSupply
  }
}
