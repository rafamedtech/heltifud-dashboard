import type { WeeklyMenu, WeeklyMenuInput } from '~~/types/types'

export function useMenu() {
  async function saveMenu(payload: WeeklyMenuInput, id?: string) {
    try {
      return await $fetch<WeeklyMenu>(id ? `/api/menu/${id}` : '/api/menu', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo guardar el menú.'))
    }
  }

  async function deleteMenuOnDB(id: string) {
    try {
      return await $fetch<{ id: string }>(`/api/menu/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo eliminar el menú.'))
    }
  }

  async function setActiveMenuOnDB(id: string) {
    try {
      return await $fetch<WeeklyMenu>(`/api/menu/${id}/activate`, {
        method: 'POST'
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo activar el menú.'))
    }
  }

  return {
    saveMenu,
    deleteMenuOnDB,
    setActiveMenuOnDB
  }
}
