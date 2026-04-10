import type { WeeklyMenu, WeeklyMenuInput } from '~~/types/types'

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

export function useMenu() {
  async function saveMenu(payload: WeeklyMenuInput, id?: string) {
    try {
      return await $fetch<WeeklyMenu>(id ? `/api/menu/${id}` : '/api/menu', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getErrorMessage(error, 'No se pudo guardar el menú.'))
    }
  }

  async function deleteMenuOnDB(id: string) {
    try {
      return await $fetch<{ id: string }>(`/api/menu/${id}`, {
        method: 'DELETE'
      })
    } catch (error) {
      throw new Error(getErrorMessage(error, 'No se pudo eliminar el menú.'))
    }
  }

  async function setActiveMenuOnDB(id: string) {
    try {
      return await $fetch<WeeklyMenu>(`/api/menu/${id}/activate`, {
        method: 'POST'
      })
    } catch (error) {
      throw new Error(getErrorMessage(error, 'No se pudo activar el menú.'))
    }
  }

  return {
    saveMenu,
    deleteMenuOnDB,
    setActiveMenuOnDB
  }
}
