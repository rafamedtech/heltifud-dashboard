import type { PlanDetail, PlanInput } from '~~/types/types'

export function usePlans() {
  async function savePlan(payload: PlanInput, id?: string) {
    try {
      return await $fetch<PlanDetail>(id ? `/api/plans/${id}` : '/api/plans', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo guardar el plan.'))
    }
  }

  async function deletePlanOnDB(id: string) {
    try {
      return await $fetch<{ id: string }>(`/api/plans/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo eliminar el plan.'))
    }
  }

  return {
    savePlan,
    deletePlanOnDB
  }
}
