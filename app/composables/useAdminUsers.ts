import type { AdminUserDetail, AdminUserInput } from '~~/types/types'

export function useAdminUsers() {
  async function saveAdminUser(payload: AdminUserInput, id?: string) {
    try {
      return await $fetch<AdminUserDetail>(id ? `/api/admin/users/${id}` : '/api/admin/users', {
        method: id ? 'PUT' : 'POST',
        body: payload
      })
    } catch (error) {
      throw new Error(getApiErrorMessage(error, 'No se pudo guardar el usuario.'))
    }
  }

  return {
    saveAdminUser
  }
}
