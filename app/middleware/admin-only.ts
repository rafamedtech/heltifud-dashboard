export default defineNuxtRouteMiddleware(async () => {
  try {
    const sessionUser = await $fetch('/api/session/me')

    if (!sessionUser.isAdmin) {
      return navigateTo('/', { replace: true })
    }
  } catch {
    return navigateTo('/', { replace: true })
  }
})
