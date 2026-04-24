import type { AdminOrderInput, AdminOrderSummary } from '~~/types/types'

export function useOrders() {
  async function saveOrder(payload: AdminOrderInput) {
    try {
      return await $fetch<AdminOrderSummary>('/api/admin/orders', {
        method: 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo guardar el pedido.'))
    }
  }

  return {
    saveOrder
  }
}
