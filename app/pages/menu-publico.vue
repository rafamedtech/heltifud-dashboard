<script setup lang="ts">
import type { DetailedMenuSlot, WeeklyMenuDetail } from '~~/types/types'
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
const VEGETARIAN_VISIBLE_DAYS = new Set(['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'])

type SlotKey = keyof typeof SLOT_LABELS
type PublicMenuType = 'ESTANDAR' | 'VEGETARIANO'

const slotKeys = Object.keys(SLOT_LABELS) as SlotKey[]
const route = useRoute()
const router = useRouter()

function menuTypeFromQuery(value: unknown): PublicMenuType {
  const queryValue = Array.isArray(value) ? value[0] : value

  return typeof queryValue === 'string'
    && ['vegetariano', 'veggie', 'veg', 'vegetarian', 'VEGETARIANO'].includes(queryValue)
    ? 'VEGETARIANO'
    : 'ESTANDAR'
}

function menuTypeToQuery(value: PublicMenuType) {
  return value === 'VEGETARIANO' ? 'vegetariano' : undefined
}

const selectedMenuTypeTab = ref<PublicMenuType>(
  menuTypeFromQuery(route.query.tipo)
)

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

function hasFood(
  item: DetailedMenuSlot['platilloPrincipal'] | null | undefined
) {
  return Boolean(item?.nombre?.trim())
}

function hasSlotContent(slot: DetailedMenuSlot) {
  return (
    hasFood(slot.platilloPrincipal)
    || hasFood(slot.guarnicion1)
    || hasFood(slot.guarnicion2)
    || slot.adicionales.some(hasFood)
  )
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
      dateKey: addDaysToDateKey(
        startDateKey,
        (day.menuDayOrder ?? index + 1) - 1
      )
    }))
    .filter(day => menu.menuType !== 'VEGETARIANO' || VEGETARIAN_VISIBLE_DAYS.has(day.dayOfWeek))
    .filter(day => slotKeys.some(slotKey => hasSlotContent(day[slotKey])))
}

function getWeekRange(menu: WeeklyMenuDetail) {
  return `${formatDate(toDateKey(menu.startDate), 'd MMM')} - ${formatDate(toDateKey(menu.endDate), 'd MMM yyyy')}`
}

function getRangeLabel(menus: WeeklyMenuDetail[]) {
  if (!menus.length) {
    return 'Fechas por definir'
  }

  const ranges = new Set(menus.map(getWeekRange))

  return ranges.size === 1
    ? getWeekRange(menus[0]!)
    : `${menus.length} menús activos`
}

const standardMenus = computed(() =>
  activeMenus.value.filter(menu => menu.menuType === 'ESTANDAR')
)
const vegetarianMenus = computed(() =>
  activeMenus.value.filter(menu => menu.menuType === 'VEGETARIANO')
)
const filteredActiveMenus = computed(() =>
  selectedMenuTypeTab.value === 'VEGETARIANO'
    ? vegetarianMenus.value
    : standardMenus.value
)
const headerDateLabel = computed(() =>
  getRangeLabel(filteredActiveMenus.value)
)
const menuTypeTabs = computed(() => [
  {
    label: 'Regular',
    value: 'ESTANDAR',
    icon: 'i-lucide-utensils',
    badge: standardMenus.value.length
  },
  {
    label: 'Vegetariano',
    value: 'VEGETARIANO',
    icon: 'i-lucide-leaf',
    badge: vegetarianMenus.value.length
  }
])

watch(
  () => route.query.tipo,
  (value) => {
    selectedMenuTypeTab.value = menuTypeFromQuery(value)
  }
)

watch(selectedMenuTypeTab, (value) => {
  const nextTipo = menuTypeToQuery(value)

  if (route.query.tipo === nextTipo) {
    return
  }

  router.replace({
    query: {
      ...route.query,
      tipo: nextTipo
    }
  })
})

useSeoMeta({
  title: 'Menú semanal | Heltifud Meal Preps',
  description: 'Consulta el menú semanal activo de Heltifud Meal Preps.',
  robots: 'index, follow'
})
</script>

<template>
  <div class="min-h-dvh bg-default text-default">
    <PublicHeader />

    <main
      class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-10"
    >
      <section
        class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      >
        <div class="max-w-2xl space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Menú de la semana
          </h1>

          <p class="text-sm leading-6 text-muted">
            Consulta la rotación activa de Heltifud, organizada por día y tiempo
            de comida.
          </p>
        </div>

        <UButton
          to="/login"
          color="neutral"
          variant="subtle"
          icon="i-lucide-square-pen"
          class="w-full cursor-pointer justify-center md:w-auto"
        >
          Editar menú
        </UButton>
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
        <div
          class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
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

      <section v-else id="menu" class="space-y-6">
        <UCard
          :ui="{
            root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
            body: 'space-y-5 p-6'
          }"
        >
          <h2 class="text-xl font-semibold text-primary">
            Información general del menú
          </h2>

          <div
            class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
          >
            <div class="space-y-2">
              <p class="text-sm font-medium text-muted">
                Semana activa
              </p>

              <div class="flex flex-wrap items-center gap-3">
                <UBadge
                  color="neutral"
                  variant="subtle"
                  icon="i-lucide-calendar-days"
                  size="lg"
                >
                  {{ headerDateLabel }}
                </UBadge>
              </div>
            </div>

            <UTabs
              v-model="selectedMenuTypeTab"
              :items="menuTypeTabs"
              color="primary"
              variant="pill"
              size="sm"
              :content="false"
              :ui="{
                root: 'w-full lg:w-auto',
                list: 'w-full overflow-x-auto rounded-xl bg-elevated p-1 lg:w-fit',
                trigger: 'shrink-0 justify-center'
              }"
            />
          </div>
        </UCard>

        <section v-if="filteredActiveMenus.length" class="space-y-6">
          <section
            v-for="menu in filteredActiveMenus"
            :key="menu.id"
            class="space-y-4"
          >
            <section
              v-for="day in getVisibleDays(menu)"
              :key="`${menu.id}-${day.dayOfWeek}`"
              class="overflow-hidden rounded-2xl border border-default/70 bg-elevated/35 shadow-sm shadow-black/5"
            >
              <div
                class="flex w-full items-center justify-between gap-3 border-b border-default/70 px-5 py-4 text-left"
              >
                <UBadge color="primary" variant="soft">
                  {{ DAY_LABELS[day.dayOfWeek] }}
                </UBadge>

                <p class="text-sm font-medium text-muted">
                  {{ formatDate(day.dateKey, 'd MMM') }}
                </p>
              </div>

              <div class="space-y-4 p-5">
                <div class="grid items-stretch gap-4 lg:grid-cols-3">
                  <article
                    v-for="slotKey in slotKeys"
                    :key="slotKey"
                    class="app-surface flex h-full min-h-40 flex-col space-y-4 p-4"
                  >
                    <div class="flex items-center justify-between gap-3">
                      <div class="flex min-w-0 items-center gap-2">
                        <UIcon
                          :name="SLOT_ICONS[slotKey]"
                          class="size-4 shrink-0 text-primary"
                        />

                        <h4
                          class="truncate text-base font-semibold text-primary"
                        >
                          {{ SLOT_LABELS[slotKey] }}
                        </h4>
                      </div>

                      <UBadge color="neutral" variant="subtle">
                        {{ formatCalories(getSlotCalories(day[slotKey])) }}
                        kcal
                      </UBadge>
                    </div>

                    <div class="flex flex-1 flex-col space-y-3">
                      <ul class="space-y-2 text-sm leading-6 text-muted">
                        <li
                          v-for="dish in getDishNames(day[slotKey])"
                          :key="dish"
                          class="flex gap-2"
                        >
                          <span
                            class="mt-2 size-1.5 shrink-0 rounded-full bg-primary/70"
                          />
                          <span>{{ dish }}</span>
                        </li>

                        <li
                          v-if="!getDishNames(day[slotKey]).length"
                          class="text-toned flex gap-2"
                        >
                          <span
                            class="mt-2 size-1.5 shrink-0 rounded-full bg-muted"
                          />
                          <span>Por definir</span>
                        </li>
                      </ul>
                    </div>
                  </article>
                </div>
              </div>
            </section>
          </section>
        </section>

        <UAlert
          v-else
          color="neutral"
          variant="soft"
          icon="i-lucide-notebook-tabs"
          :title="`Sin menú ${selectedMenuTypeTab === 'VEGETARIANO' ? 'vegetariano' : 'regular'} activo`"
          description="Cuando este tipo de menú entre en su ventana de publicación aparecerá aquí."
        />
      </section>
    </main>

    <PublicFooter />
  </div>
</template>
