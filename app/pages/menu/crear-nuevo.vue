<script setup lang="ts">
import type { FoodCatalogItem } from '~~/types/types'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

const { data: catalogItems, status } = useLazyFetch<FoodCatalogItem[]>('/api/food-components', {
  key: 'menu-form-catalog-items',
  default: () => []
})

const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')

useSeoMeta({
  title: 'Gestión de menús semanales | Crear nuevo menú | Heltifud Meal Preps',
  description: 'Crea un nuevo menú semanal dentro del panel de gestión de menús de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

function onSaved() {
  navigateTo('/menu')
}
</script>

<template>
  <main>
    <AdminMenuForm
      :catalog-items="catalogItems"
      :loading-slots="isLoading"
      @saved="onSaved"
    />
  </main>
</template>
