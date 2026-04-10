export default defineNuxtRouteMiddleware((to) => {
  const session = useSupabaseSession()

  if (!session.value) {
    return navigateTo({
      path: '/login',
      query: {
        redirect: to.fullPath
      }
    }, { replace: true })
  }
})
