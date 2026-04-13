<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const toast = useToast()

const open = ref(false)
const isSigningOut = ref(false)

const links = [[{
  label: 'Resumen',
  icon: 'i-lucide-layout-dashboard',
  to: '/',
  exact: true,
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Menús',
  icon: 'i-lucide-calendar-range',
  to: '/menu',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Platillos',
  icon: 'i-lucide-chef-hat',
  to: '/platillos',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Insumos',
  icon: 'i-lucide-package-search',
  to: '/configuracion/insumos',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Categorías',
  icon: 'i-lucide-tags',
  to: '/configuracion/categorias-insumos',
  onSelect: () => {
    open.value = false
  }
}, {
  label: 'Configuración',
  icon: 'i-lucide-settings-2',
  to: '/configuracion',
  onSelect: () => {
    open.value = false
  }
}], [{
  label: 'Ver menú público',
  icon: 'i-lucide-external-link',
  to: '/menu-publico',
  onSelect: () => {
    open.value = false
  }
}]] satisfies NavigationMenuItem[][]

const groups = computed(() => [{
  id: 'admin',
  label: 'Administración',
  items: links.flat()
}, {
  id: 'session',
  label: 'Sesión',
  items: [{
    id: 'logout',
    label: 'Cerrar sesión',
    icon: 'i-lucide-log-out',
    onSelect: async () => {
      await onSignOut()
    }
  }]
}])

async function onSignOut() {
  if (isSigningOut.value) {
    return
  }

  isSigningOut.value = true

  const { error } = await supabase.auth.signOut()

  if (error) {
    toast.add({
      title: 'No se pudo cerrar la sesión',
      description: error.message,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    isSigningOut.value = false
    return
  }

  isSigningOut.value = false
  await navigateTo('/login', { replace: true })
}
</script>

<template>
  <UDashboardGroup unit="rem" class="h-dvh overflow-hidden">
    <UDashboardSidebar
      id="admin-layout"
      v-model:open="open"
      collapsible
      resizable
      class="bg-elevated/35"
      :ui="{ footer: 'border-t border-default/70' }"
    >
      <template #header="{ collapsed }">
        <div class="flex items-center gap-3 px-1">
          <div class="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <UIcon name="i-lucide-utensils-crossed" class="size-5" />
          </div>

          <div v-if="!collapsed" class="min-w-0">
            <p class="truncate text-sm font-semibold uppercase tracking-[0.24em] text-primary">
              Heltifud
            </p>
            <p class="truncate text-xs text-muted">
              Administración
            </p>
          </div>
        </div>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" class="bg-transparent ring-default" />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[0]"
          orientation="vertical"
          tooltip
          popover
        />

        <UNavigationMenu
          :collapsed="collapsed"
          :items="links[1]"
          orientation="vertical"
          tooltip
          class="mt-auto"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="flex items-center gap-3">
          <UAvatar
            :alt="user?.email ?? 'Admin'"
            icon="i-lucide-user"
            size="md"
          />

          <div v-if="!collapsed" class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-highlighted">
              {{ user?.email ?? 'Sin sesión' }}
            </p>
            <p class="truncate text-xs text-muted">
              {{ route.path }}
            </p>
          </div>

          <UButton
            color="neutral"
            variant="ghost"
            square
            :loading="isSigningOut"
            icon="i-lucide-log-out"
            @click="onSignOut"
          />
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardSearch :groups="groups" />

    <UDashboardPanel
      id="admin-panel"
      class="min-h-0"
      :ui="{ body: 'admin-scrollbar min-h-0 overflow-y-auto py-6 sm:py-8 [scrollbar-gutter:stable]' }"
    >
      <template #header>
        <UDashboardNavbar title="Heltifud Admin">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 sm:px-6">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
