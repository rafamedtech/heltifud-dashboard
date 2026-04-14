<script setup lang="ts">
import type { FoodCatalogItem } from '~~/types/types'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

useSeoMeta({
  title: 'Gestión de platillos | Heltifud Meal Preps',
  description: 'Administra el catálogo de platillos reutilizables dentro del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

const route = useRoute()
const { navigateBack } = useRouteBackNavigation()

const {
  data: items,
  refresh,
  status
} = useFetch<FoodCatalogItem[]>('/api/food-components', {
  default: () => []
})

const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')
const returnTo = computed(() => (typeof route.query.returnTo === 'string' ? route.query.returnTo : undefined))

async function onBack() {
  await navigateBack(returnTo.value ?? '/platillos')
}

function editTo(item: FoodCatalogItem) {
  return { path: `/platillos/${item.id}`, query: returnTo.value ? { returnTo: returnTo.value } : {} }
}
</script>

<template>
  <main class="flex min-h-full flex-col space-y-6">
    <section>
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Platillos
          </h1>
          <p class="max-w-2xl text-sm text-muted">
            Administra el catálogo de platillos para los menús semanales.
          </p>
        </div>

        <div class="flex items-center gap-3 md:justify-end">
        <UButton
          v-if="returnTo"
          variant="ghost"
          color="neutral"
          icon="i-lucide-arrow-left"
          @click="onBack"
        >
          Regresar
        </UButton>

        <UButton
          :to="{ path: '/platillos/crear-nuevo', query: returnTo ? { returnTo } : {} }"
          icon="i-lucide-plus"
        >
          Nuevo platillo
        </UButton>
        </div>
      </div>
    </section>

    <div class="mx-auto w-full max-w-5xl">
      <UCard
        class="app-surface flex-1 overflow-hidden"
        :ui="{ body: 'p-0 sm:p-0', header: 'p-0 sm:p-0', footer: 'p-0 sm:p-0' }"
      >
        <AdminFoodCatalogTable
          :items="items"
          :loading="isLoading"
          :edit-to="editTo"
        />
      </UCard>
    </div>
  </main>
</template>
