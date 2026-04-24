<script setup lang="ts">
import type { FoodCatalogItem } from '~~/types/types'
import { formatDate } from '~/utils/formatters'

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
const summaryCardPlaceholders = [1, 2, 3]
const tableRowPlaceholders = [1, 2, 3, 4, 5]

const latestUpdatedItem = computed(() => items.value[0] ?? null)
const latestCreatedItem = computed(() => {
  return [...items.value]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] ?? null
})
const itemsWithoutRecipe = computed(() => {
  return items.value.filter(item => item.calorias <= 0).length
})
const summaryCards = computed(() => [
  {
    key: 'latest-updated',
    title: 'Último actualizado',
    description: latestUpdatedItem.value
      ? latestUpdatedItem.value.nombre
      : 'Haz cambios en un platillo para verlo reflejado aquí.',
    icon: 'i-lucide-utensils-crossed',
    statIcon: 'i-lucide-clock-3',
    stat: latestUpdatedItem.value
      ? formatDate(latestUpdatedItem.value.updatedAt)
      : 'Sin registros',
    actionLabel: latestUpdatedItem.value ? 'Abrir' : 'Ver lista',
    actionTo: latestUpdatedItem.value
      ? `/platillos/${latestUpdatedItem.value.id}`
      : '#platillos-list'
  },
  {
    key: 'latest-created',
    title: 'Último agregado',
    description: latestCreatedItem.value
      ? latestCreatedItem.value.nombre
      : 'Crea tu primer platillo para empezar a poblar catálogo.',
    icon: 'i-lucide-sparkles',
    statIcon: 'i-lucide-calendar-days',
    stat: latestCreatedItem.value
      ? formatDate(latestCreatedItem.value.createdAt)
      : 'Sin registros',
    actionLabel: latestCreatedItem.value ? 'Editar' : 'Crear',
    actionTo: latestCreatedItem.value
      ? `/platillos/${latestCreatedItem.value.id}`
      : '/platillos/crear-nuevo'
  },
  {
    key: 'total-items',
    title: 'Platillos creados',
    description: itemsWithoutRecipe.value > 0
      ? `${itemsWithoutRecipe.value} ${itemsWithoutRecipe.value === 1 ? 'platillo sigue' : 'platillos siguen'} sin receta capturada completa.`
      : 'Todos los platillos actuales ya tienen captura base en catálogo.',
    icon: 'i-lucide-files',
    statIcon: 'i-lucide-chart-column',
    stat: `${items.value.length} ${items.value.length === 1 ? 'registro' : 'registros'}`,
    actionLabel: 'Nuevo',
    actionTo: '/platillos/crear-nuevo'
  }
])

async function onBack() {
  await navigateBack(returnTo.value ?? '/platillos')
}

function editTo(item: FoodCatalogItem) {
  return { path: `/platillos/${item.id}`, query: returnTo.value ? { returnTo: returnTo.value } : {} }
}
</script>

<template>
  <main class="flex min-h-full flex-col space-y-6">
    <section
      class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
    >
      <div class="space-y-2">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Platillos
          </h1>
          <p class="max-w-2xl text-sm text-muted">
            Administra catálogo de platillos y mantén lista base alineada con menús semanales.
          </p>
        </div>
      </div>

      <div class="flex w-full items-center gap-3 lg:w-auto lg:justify-end">
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
          class="w-full justify-center lg:w-auto"
          size="lg"
        >
          Nuevo platillo
        </UButton>
      </div>
    </section>

    <section class="space-y-4">
      <section class="grid gap-3 lg:grid-cols-3">
        <UCard
          v-if="isLoading"
          v-for="placeholder in summaryCardPlaceholders"
          :key="`summary-skeleton-${placeholder}`"
          :ui="{
            root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
            body: 'flex min-h-[176px] flex-col p-4 sm:p-4.5',
          }"
        >
          <div class="size-9 animate-pulse rounded-lg bg-elevated" />
          <div class="mt-4 space-y-2">
            <div class="h-5 w-28 animate-pulse rounded-md bg-elevated" />
            <div class="h-4 w-full animate-pulse rounded-md bg-elevated" />
            <div class="h-4 w-3/4 animate-pulse rounded-md bg-elevated" />
          </div>
          <div class="mt-auto pt-5">
            <div class="border-t border-default/70 pt-3">
              <div class="flex items-center justify-between gap-3">
                <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
                <div class="h-8 w-16 animate-pulse rounded-lg bg-elevated" />
              </div>
            </div>
          </div>
        </UCard>

        <UCard
          v-else
          v-for="card in summaryCards"
          :key="card.key"
          :ui="{
            root: 'group relative overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5 transition-colors duration-200 hover:border-default',
            body: 'relative flex min-h-[176px] flex-col p-4 sm:p-4.5',
          }"
        >
          <div
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
          >
            <UIcon :name="card.icon" class="size-4" />
          </div>

          <div class="mt-4 space-y-2">
            <div class="space-y-1.5">
              <p class="text-base font-semibold text-highlighted">
                {{ card.title }}
              </p>
              <p class="line-clamp-2 text-sm leading-5 text-muted">
                {{ card.description }}
              </p>
            </div>
          </div>

          <div class="mt-auto pt-5">
            <div class="border-t border-default/70 pt-3">
              <div class="flex items-center justify-between gap-3">
                <div class="flex min-w-0 items-center gap-2 text-muted">
                  <UIcon :name="card.statIcon" class="size-4 shrink-0" />
                  <span class="truncate text-sm">{{ card.stat }}</span>
                </div>

                <UButton
                  :to="card.actionTo"
                  size="sm"
                  variant="ghost"
                  color="neutral"
                  icon="i-lucide-arrow-right"
                  trailing
                  :ui="{
                    base: 'rounded-lg px-2.5 text-muted hover:text-highlighted',
                  }"
                >
                  {{ card.actionLabel }}
                </UButton>
              </div>
            </div>
          </div>
        </UCard>
      </section>

      <UAlert
        v-if="!isLoading && !items.length"
        title="Aún no hay platillos"
        description="Empieza creando primer platillo desde botón de arriba."
        color="neutral"
        variant="soft"
        icon="i-lucide-utensils-crossed"
      />

      <section
        id="platillos-list"
        v-else-if="!isLoading"
        class="space-y-4"
      >
        <UCard
          :ui="{
            root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
            body: 'p-0 sm:p-0'
          }"
        >
          <div class="space-y-5 p-5 sm:p-6">
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-primary">
                Platillos registrados
              </h2>
            </div>

            <div class="-mx-5 sm:-mx-6">
              <AdminFoodCatalogTable
                :items="items"
                :loading="isLoading"
                :edit-to="editTo"
              />
            </div>
          </div>
        </UCard>
      </section>

      <section v-else class="space-y-4">
        <UCard
          :ui="{
            root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
            body: 'p-0 sm:p-0'
          }"
        >
          <div class="space-y-5 p-5 sm:p-6">
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-primary">
                Platillos registrados
              </h2>
            </div>

            <div class="overflow-hidden rounded-xl border border-default/70">
              <div class="grid grid-cols-[minmax(0,1.8fr)_1fr_1fr_1fr_auto] gap-4 border-b border-default/70 bg-default px-4 py-3">
                <div class="h-4 w-20 animate-pulse rounded-md bg-default/70" />
                <div class="h-4 w-16 animate-pulse rounded-md bg-default/70" />
                <div class="h-4 w-16 animate-pulse rounded-md bg-default/70" />
                <div class="h-4 w-20 animate-pulse rounded-md bg-default/70" />
                <div class="ml-auto h-4 w-16 animate-pulse rounded-md bg-default/70" />
              </div>

              <div
                v-for="placeholder in tableRowPlaceholders"
                :key="`row-skeleton-${placeholder}`"
                class="grid grid-cols-[minmax(0,1.8fr)_1fr_1fr_1fr_auto] gap-4 border-b border-default/70 px-4 py-4 last:border-b-0"
              >
                <div class="space-y-2">
                  <div class="h-4 w-36 animate-pulse rounded-md bg-elevated" />
                </div>
                <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
                <div class="h-4 w-20 animate-pulse rounded-md bg-elevated" />
                <div class="h-4 w-28 animate-pulse rounded-md bg-elevated" />
                <div class="ml-auto h-8 w-8 animate-pulse rounded-lg bg-elevated" />
              </div>
            </div>
          </div>
        </UCard>
      </section>
    </section>
  </main>
</template>
