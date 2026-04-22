import type { PlanDetail, PlanInput } from '~~/types/types'

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

export function usePlans() {
  async function savePlan(payload: PlanInput, id?: string) {
    try {
      return await $fetch<PlanDetail>(id ? `/api/plans/${id}` : '/api/plans', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getErrorMessage(error, 'No se pudo guardar el plan.'))
    }
  }

  async function deletePlanOnDB(id: string) {
    try {
      return await $fetch<{ id: string }>(`/api/plans/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      throw new Error(getErrorMessage(error, 'No se pudo eliminar el plan.'))
    }
  }

  return {
    savePlan,
    deletePlanOnDB
  }
}
