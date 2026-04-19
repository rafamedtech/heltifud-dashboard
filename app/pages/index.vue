<script setup lang="ts">
import type { FoodCatalogItem, WeeklyMenu } from '~~/types/types'
import { formatDate, formatWeekRange } from '~/utils/formatters'

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

const { data: menus, status: menusStatus } = await useLazyFetch<WeeklyMenu[]>('/api/menu/all', {
  default: () => []
})

const { data: catalogItems, status: catalogStatus } = await useLazyFetch<FoodCatalogItem[]>('/api/food-components', {
  default: () => []
})

const isLoading = computed(() => menusStatus.value === 'pending' || catalogStatus.value === 'pending')
const activeMenu = computed(() => menus.value.find(menu => menu.isActive) ?? null)
const latestMenu = computed(() => menus.value[0] ?? null)
const latestCatalogItem = computed(() => catalogItems.value[0] ?? null)

useSeoMeta({
  title: 'Gestión administrativa | Heltifud Meal Preps',
  description: 'Consulta y administra las principales secciones del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})
</script>

<template>
  <main class="space-y-6">
    <section class="space-y-2">
      <h1 class="text-3xl font-semibold tracking-tight text-primary">
        Resumen operativo
      </h1>
      <p class="max-w-3xl text-sm text-muted">
        Este panel centraliza la rotación semanal y el catálogo de platillos para que el equipo mantenga el menú público siempre actualizado.
      </p>
    </section>

    <section class="grid gap-4 lg:grid-cols-4">
      <UCard class="app-surface-soft" :ui="{ body: 'space-y-2 p-5' }">
        <p class="text-xs uppercase tracking-[0.18em] text-muted">
          Menú activo
        </p>
        <p class="text-lg font-semibold text-highlighted">
          {{ activeMenu?.name ?? 'Sin menú activo' }}
        </p>
        <p class="text-sm text-muted">
          {{ activeMenu ? formatWeekRange(activeMenu.startDate, activeMenu.endDate) : 'Activa uno desde la sección de menús.' }}
        </p>
      </UCard>

      <UCard class="app-surface-soft" :ui="{ body: 'space-y-2 p-5' }">
        <p class="text-xs uppercase tracking-[0.18em] text-muted">
          Menús totales
        </p>
        <p class="text-3xl font-semibold text-highlighted">
          {{ menus.length }}
        </p>
        <p class="text-sm text-muted">
          Historial completo de rotaciones semanales.
        </p>
      </UCard>

      <UCard class="app-surface-soft" :ui="{ body: 'space-y-2 p-5' }">
        <p class="text-xs uppercase tracking-[0.18em] text-muted">
          Platillos en catálogo
        </p>
        <p class="text-3xl font-semibold text-highlighted">
          {{ catalogItems.length }}
        </p>
        <p class="text-sm text-muted">
          Disponibles para armar menús nuevos.
        </p>
      </UCard>

      <UCard class="app-surface-soft" :ui="{ body: 'space-y-2 p-5' }">
        <p class="text-xs uppercase tracking-[0.18em] text-muted">
          Último platillo
        </p>
        <p class="text-lg font-semibold text-highlighted">
          {{ latestCatalogItem?.nombre ?? 'Sin capturas' }}
        </p>
        <p class="text-sm text-muted">
          {{ latestCatalogItem ? `Actualizado el ${formatDate(latestCatalogItem.updatedAt)}` : 'Agrega tu primer platillo al catálogo.' }}
        </p>
      </UCard>
    </section>

    <UAlert
      v-if="isLoading"
      color="neutral"
      variant="soft"
      icon="i-lucide-loader-circle"
      title="Cargando resumen"
      description="Estamos trayendo el estado actual del catálogo y los menús."
    />

    <section class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <UCard class="app-surface" :ui="{ body: 'space-y-4 p-6' }">
        <div class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold text-highlighted">
              Siguiente paso recomendado
            </h2>
            <p class="text-sm text-muted">
              Lo más útil que puedes hacer a continuación según el estado actual.
            </p>
          </div>

          <UButton
            to="/menu"
            color="neutral"
            variant="ghost"
            icon="i-lucide-arrow-right"
          />
        </div>

        <div v-if="activeMenu" class="space-y-3 rounded-2xl border border-default/70 bg-elevated/35 p-5">
          <p class="text-sm text-muted">
            El menú activo ahora mismo es:
          </p>
          <p class="text-2xl font-semibold text-highlighted">
            {{ activeMenu.name }}
          </p>
          <p class="text-sm text-muted">
            {{ formatWeekRange(activeMenu.startDate, activeMenu.endDate) }}
          </p>
          <div class="flex flex-wrap gap-3 pt-2">
            <UButton to="/menu-publico" icon="i-lucide-eye">
              Ver público
            </UButton>
            <UButton
              :to="`/menu/${activeMenu.id}`"
              color="neutral"
              variant="outline"
              icon="i-lucide-square-pen"
            >
              Editar
            </UButton>
          </div>
        </div>

        <div v-else class="space-y-3 rounded-2xl border border-default/70 bg-elevated/35 p-5">
          <p class="text-sm text-muted">
            No hay ningún menú activo todavía.
          </p>
          <UButton to="/menu/crear-nuevo" icon="i-lucide-plus">
            Crear primer menú
          </UButton>
        </div>
      </UCard>

      <UCard class="app-surface" :ui="{ body: 'space-y-4 p-6' }">
        <h2 class="text-xl font-semibold text-highlighted">
          Actividad reciente
        </h2>

        <div class="space-y-3">
          <div class="rounded-2xl border border-default/70 bg-elevated/25 p-4">
            <p class="text-sm font-medium text-highlighted">
              Último menú creado
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ latestMenu ? `${latestMenu.name} · ${formatDate(latestMenu.createdAt)}` : 'Aún no hay menús registrados.' }}
            </p>
          </div>

          <div class="rounded-2xl border border-default/70 bg-elevated/25 p-4">
            <p class="text-sm font-medium text-highlighted">
              Último platillo actualizado
            </p>
            <p class="mt-1 text-sm text-muted">
              {{ latestCatalogItem ? `${latestCatalogItem.nombre} · ${formatDate(latestCatalogItem.updatedAt)}` : 'Aún no hay platillos en catálogo.' }}
            </p>
          </div>
        </div>
      </UCard>
    </section>
  </main>
</template>
