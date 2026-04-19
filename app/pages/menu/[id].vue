<script setup lang="ts">
import type {
  FoodCatalogItem,
  WeeklyMenu
} from '~~/types/types'

const route = useRoute()

const {
  data: menu,
  status,
  error
} = useLazyFetch<WeeklyMenu>(`/api/menu/${route.params.id}`, {
  key: `admin-menu-${route.params.id}`
})

const {
  data: catalogItems,
  status: catalogStatus
} = useLazyFetch<FoodCatalogItem[]>('/api/food-components', {
  key: 'menu-form-catalog-items',
  default: () => []
})

const isLoading = computed(
  () =>
    status.value === 'idle'
    || status.value === 'pending'
    || catalogStatus.value === 'idle'
    || catalogStatus.value === 'pending'
)

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Gestión de menús semanales | Editar menú | Heltifud Meal Preps',
  description:
    'Edita un menú semanal existente dentro del panel de gestión de menús de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="space-y-6">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="No se pudo cargar el menú"
      :description="error.data?.message || error.statusMessage || 'Intenta de nuevo en unos segundos.'"
      icon="i-lucide-circle-alert"
    />

    <AdminMenuEditorPage
      v-else
      :menu="menu"
      :catalog-items="catalogItems"
      :is-loading="isLoading"
      mode="edit"
    />
  </main>
</template>
