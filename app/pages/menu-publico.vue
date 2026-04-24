<script setup lang="ts">
import type { DetailedDayMenu, DetailedMenuSlot, WeeklyMenuDetail } from '~~/types/types'
import { formatCalories, formatDate } from '~/utils/formatters'

definePageMeta({
  layout: false
})

const SLOT_LABELS = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena'
} as const

const SLOT_ICONS = {
  desayuno: 'i-lucide-egg-fried',
  comida: 'i-lucide-drumstick',
  cena: 'i-lucide-soup'
} as const

const DAY_LABELS = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo'
} as const

type SlotKey = keyof typeof SLOT_LABELS

const slotKeys = Object.keys(SLOT_LABELS) as SlotKey[]

const {
  data: activeMenus,
  status,
  error
} = await useFetch<WeeklyMenuDetail[]>('/api/menu', {
  default: () => []
})

const isLoading = computed(() => status.value === 'pending')

function toDateKey(value: string) {
  return value.slice(0, 10)
}

function addDaysToDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split('-').map(Number)

  if (!year || !month || !day) {
    return dateKey
  }

  const date = new Date(year, month - 1, day, 12)
  date.setDate(date.getDate() + days)

  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')

  return `${nextYear}-${nextMonth}-${nextDay}`
}

function hasFood(item: DetailedMenuSlot['platilloPrincipal'] | null | undefined) {
  return Boolean(item?.nombre?.trim())
}

function hasSlotContent(slot: DetailedMenuSlot) {
  return hasFood(slot.platilloPrincipal)
    || hasFood(slot.guarnicion1)
    || hasFood(slot.guarnicion2)
    || slot.adicionales.some(hasFood)
}

function getSlotCalories(slot: DetailedMenuSlot) {
  const foods = [
    slot.platilloPrincipal,
    slot.guarnicion1,
    slot.guarnicion2,
    ...slot.adicionales
  ]

  return foods.reduce((total, item) => total + (item?.calorias ?? 0), 0)
}

function getDishNames(slot: DetailedMenuSlot) {
  return [
    slot.platilloPrincipal.nombre,
    slot.guarnicion1?.nombre,
    slot.guarnicion2?.nombre,
    ...slot.adicionales.map(item => item.nombre)
  ].filter(Boolean)
}

function getVisibleDays(menu: WeeklyMenuDetail) {
  const startDateKey = toDateKey(menu.startDate)

  return menu.days
    .map((day, index) => ({
      ...day,
      dateKey: addDaysToDateKey(startDateKey, (day.menuDayOrder ?? index + 1) - 1)
    }))
    .filter(day => slotKeys.some(slotKey => hasSlotContent(day[slotKey])))
}

function getWeekRange(menu: WeeklyMenuDetail) {
  return `${formatDate(toDateKey(menu.startDate), 'd MMM')} - ${formatDate(toDateKey(menu.endDate), 'd MMM yyyy')}`
}

function formatMenuType(menu: WeeklyMenuDetail) {
  return menu.menuType === 'VEGETARIANO' ? 'Vegetariano' : 'Estándar'
}

const firstActiveMenu = computed(() => activeMenus.value[0] ?? null)
const headerDateLabel = computed(() => {
  if (!activeMenus.value.length) {
    return 'Fechas por definir'
  }

  const ranges = new Set(activeMenus.value.map(getWeekRange))

  return ranges.size === 1
    ? getWeekRange(firstActiveMenu.value!)
    : `${activeMenus.value.length} menús activos`
})

useSeoMeta({
  title: 'Menú semanal | Heltifud Meal Preps',
  description: 'Consulta el menú semanal activo de Heltifud Meal Preps.',
  robots: 'index, follow'
})
</script>

<template>
  <div class="min-h-dvh bg-gradient-to-b from-primary/5 via-default to-primary/5 text-default">
    <PublicHeader />

    <main class="mx-auto flex w-full max-w-7xl flex-col gap-7 px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
      <section class="space-y-6">
        <div class="space-y-5">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Menú de la semana
          </h1>

          <div class="flex flex-wrap items-center gap-3 text-sm font-medium text-muted sm:text-base">
            <UIcon
              name="i-lucide-calendar-days"
              class="size-5 text-highlighted"
            />
            <span>{{ headerDateLabel }}</span>

            <UButton
              to="/login"
              color="neutral"
              variant="outline"
              icon="i-lucide-square-pen"
              class="rounded-xl"
            >
              Editar menú
            </UButton>
          </div>
        </div>
      </section>

      <UAlert
        v-if="isLoading"
        color="neutral"
        variant="soft"
        icon="i-lucide-loader-circle"
        title="Cargando menú"
        description="Estamos preparando la rotación semanal."
      />

      <UAlert
        v-else-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="No se pudo cargar el menú"
        description="Intenta de nuevo en unos minutos."
      />

      <UCard
        v-else-if="!activeMenus.length"
        :ui="{
          root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
          body: 'p-6 sm:p-8'
        }"
      >
        <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="space-y-2">
            <p class="text-lg font-semibold text-highlighted">
              Sin menú activo
            </p>
            <p class="max-w-xl text-sm text-muted">
              El menú aparecerá aquí cuando entre en su ventana de publicación.
            </p>
          </div>

          <UButton
            to="/login"
            color="neutral"
            variant="outline"
            icon="i-lucide-lock-keyhole"
          >
            Admin
          </UButton>
        </div>
      </UCard>

      <section
        v-else
        id="menu"
        class="space-y-10"
      >
        <section
          v-for="menu in activeMenus"
          :key="menu.id"
          class="space-y-5"
        >
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="space-y-1">
              <UBadge
                color="primary"
                variant="subtle"
                :icon="menu.menuType === 'VEGETARIANO' ? 'i-lucide-leaf' : 'i-lucide-utensils'"
              >
                {{ formatMenuType(menu) }}
              </UBadge>
              <h2 class="text-xl font-semibold tracking-tight text-highlighted">
                {{ menu.name }}
              </h2>
            </div>

            <p class="text-sm font-medium text-muted">
              {{ getWeekRange(menu) }}
            </p>
          </div>

          <UCard
            v-for="day in getVisibleDays(menu)"
            :key="`${menu.id}-${day.dayOfWeek}`"
            :ui="{
              root: 'overflow-hidden rounded-2xl border border-default/80 ring-0 divide-y-0 bg-default/80 shadow-sm shadow-black/5 backdrop-blur',
              header: 'border-b border-default/80 px-5 py-4 sm:px-6',
              body: 'p-0'
            }"
          >
            <template #header>
              <div class="flex items-center justify-between gap-3">
                <h3 class="text-xl font-semibold tracking-tight text-primary">
                  {{ DAY_LABELS[day.dayOfWeek] }}
                </h3>

                <span class="text-sm font-medium text-muted">
                  {{ formatDate(day.dateKey, 'd MMM') }}
                </span>
              </div>
            </template>

            <div class="grid divide-y divide-default/80 md:grid-cols-3 md:divide-x md:divide-y-0">
              <article
                v-for="slotKey in slotKeys"
                :key="slotKey"
                class="min-h-40 p-5 sm:p-6"
              >
                <div class="flex items-center gap-3">
                  <UIcon
                    :name="SLOT_ICONS[slotKey]"
                    class="size-5 shrink-0 text-highlighted"
                  />

                  <h4 class="text-lg font-semibold tracking-tight text-highlighted">
                    {{ SLOT_LABELS[slotKey] }}
                  </h4>
                </div>

                <div class="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                  <ul class="space-y-2 text-sm leading-6 text-muted">
                    <li
                      v-for="dish in getDishNames(day[slotKey])"
                      :key="dish"
                      class="pl-0"
                    >
                      - {{ dish }}
                    </li>

                    <li
                      v-if="!getDishNames(day[slotKey]).length"
                      class="text-toned"
                    >
                      - Por definir
                    </li>
                  </ul>

                  <p class="whitespace-nowrap text-sm font-semibold text-primary">
                    {{ formatCalories(getSlotCalories(day[slotKey])) }} Cal
                  </p>
                </div>
              </article>
            </div>
          </UCard>
        </section>
      </section>
    </main>

    <PublicFooter />
  </div>
</template>
