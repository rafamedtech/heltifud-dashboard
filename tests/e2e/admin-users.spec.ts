import { expect, test } from '@playwright/test'

const mockUsers = [
  {
    id: 'user-admin-1',
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-04-20T10:00:00.000Z',
    email: 'admin@heltifud.com',
    nombre: 'Alicia',
    apellidos: 'Admin',
    telefono: '6641234567',
    role: 'ADMIN',
    status: 'ACTIVO',
    customerType: null,
    ordersCountCached: 2,
    lastOrderAt: '2026-04-18T18:30:00.000Z',
    totalSpentCached: 1299.5
  },
  {
    id: 'user-client-1',
    createdAt: '2026-04-03T09:15:00.000Z',
    updatedAt: '2026-04-19T15:45:00.000Z',
    email: 'maria@correo.com',
    nombre: 'María',
    apellidos: 'Cliente',
    telefono: '6647654321',
    role: 'CLIENTE',
    status: 'ACTIVO',
    customerType: 'VEGETARIANO',
    ordersCountCached: 4,
    lastOrderAt: null,
    totalSpentCached: null
  }
] as const

test('renderiza la página de usuarios con sidebar y filtros locales', async ({ page }) => {
  await page.route('**/api/session/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 'user-admin-1',
        authUserId: 'auth-admin-1',
        email: 'admin@heltifud.com',
        role: 'ADMIN',
        isAdmin: true
      })
    })
  })

  await page.route('**/api/admin/users', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockUsers)
    })
  })

  await page.goto('/login')
  await page.getByRole('button', { name: 'Entrar' }).waitFor()
  await page.waitForFunction(() => {
    const root = document.querySelector('#__nuxt') as (HTMLElement & {
      __vue_app__?: {
        config?: {
          globalProperties?: {
            $router?: unknown
            $nuxt?: unknown
          }
        }
      }
    }) | null

    return Boolean(
      root?.__vue_app__?.config?.globalProperties?.$router
      && root?.__vue_app__?.config?.globalProperties?.$nuxt
    )
  })

  await page.evaluate(async () => {
    type RouterLike = {
      push: (to: string) => Promise<unknown>
    }

    type NuxtAppLike = {
      payload?: {
        state?: Record<string, unknown>
      }
    }

    type VueAppRoot = HTMLElement & {
      __vue_app__?: {
        config?: {
          globalProperties?: {
            $router?: RouterLike
            $nuxt?: NuxtAppLike
          }
        }
      }
    }

    const session = {
      user: {
        email: 'admin@heltifud.com'
      }
    }

    const root = document.querySelector('#__nuxt') as VueAppRoot | null
    const router = root?.__vue_app__?.config?.globalProperties?.$router
    const nuxtApp = root?.__vue_app__?.config?.globalProperties?.$nuxt

    if (!router) {
      throw new Error('No se pudo acceder al router de Nuxt para la smoke e2e.')
    }

    if (nuxtApp?.payload?.state) {
      nuxtApp.payload.state.$ssupabase_session = session
      nuxtApp.payload.state.$ssupabase_user = session.user
    }

    await router.push('/usuarios')
  })

  await expect(page).toHaveURL(/\/usuarios$/)
  await expect(page.getByRole('heading', { name: 'Usuarios', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Usuarios' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Nuevo usuario' })).toBeVisible()
  await expect(page.getByText('Usuarios activos', { exact: true })).toBeVisible()
  await expect(page.getByText('Directorio de usuarios', { exact: true })).toBeVisible()
  await expect(page.getByText('Alicia Admin', { exact: true })).toBeVisible()
  await expect(page.getByText('María Cliente', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: /^Filtrar$/ }).nth(2).click()
  await expect(page.getByText('Alicia Admin', { exact: true })).toBeVisible()
  await expect(page.getByText('María Cliente', { exact: true })).not.toBeVisible()

  await page.getByRole('button', { name: 'Limpiar filtros' }).click()
  await page.getByPlaceholder('Buscar por nombre, email o teléfono').fill('maria')

  await expect(page.getByText('María Cliente', { exact: true })).toBeVisible()
  await expect(page.getByText('Alicia Admin', { exact: true })).not.toBeVisible()
})
