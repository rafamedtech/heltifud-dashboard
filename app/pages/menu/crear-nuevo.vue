<script setup lang="ts">
import type { FoodCatalogItem } from '~~/types/types'

definePageMeta({
  layout: 'admin'
})

const {
  data: catalogItems,
  status
} = useFetch<FoodCatalogItem[]>('/api/food-components', {
  key: 'menu-form-catalog-items',
  server: false,
  lazy: true,
  default: () => []
})
const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')

useSeoMeta({
  title: 'Gestión de menús semanales | Crear nuevo menú | Heltifud Meal Preps',
  description: 'Crea un nuevo menú semanal dentro del panel de gestión de menús de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <AdminMenuEditorPage
    :catalog-items="catalogItems"
    :is-loading="isLoading"
    mode="create"
  />
</template>
