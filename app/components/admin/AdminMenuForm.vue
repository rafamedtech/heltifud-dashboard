<script setup lang="ts">
import type { FoodCatalogItem, MenuSlot, WeeklyMenu } from '~~/types/types'
import { CalendarDate, DateFormatter, getLocalTimeZone } from '@internationalized/date'
import type { DateValue } from '@internationalized/date'
import { z } from 'zod'
import {
  DAY_LABELS,
  SLOT_LABELS,
  SLOT_ORDER,
  cloneSlot,
  createMenuFormState,
  type WeeklyMenuFormState
} from '~/utils/heltifud'

const menuTypeOptions = [
  {
    label: 'Estándar',
    value: 'ESTANDAR',
    icon: 'i-lucide-utensils'
  },
  {
    label: 'Vegetariano',
    value: 'VEGETARIANO',
    icon: 'i-lucide-leaf'
  }
]

const props = withDefaults(defineProps<{
  formId?: string
  hideSubmit?: boolean
  menu?: WeeklyMenu | null
  catalogItems: FoodCatalogItem[]
  loadingFields?: boolean
  loadingSlots?: boolean
  mode?: 'create' | 'edit'
}>(), {
  formId: undefined,
  hideSubmit: false,
  menu: null,
  loadingFields: false,
  loadingSlots: false,
  mode: 'create'
})

const emit = defineEmits<{
  saved: []
  'dirty-change': [value: boolean]
  'validity-change': [value: boolean]
  'submit-state-change': [value: boolean]
}>()

const toast = useToast()
const { saveMenu } = useMenu()

const state = ref<WeeklyMenuFormState>(createMenuFormState(props.menu))
const openDayKeys = ref<string[]>([])
const initialSnapshot = ref('')
const isSubmitting = ref(false)
const hasTriedSubmit = ref(false)
const primarySlotKeys = ['desayuno', 'comida', 'cena'] as const
const secondarySlotKeys = ['snack1', 'snack2'] as const
const visibleDayKeys = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const
const timeZone = getLocalTimeZone()
const dateFormatter = new DateFormatter('es-MX', {
  dateStyle: 'medium'
})
const visibleDays = computed(() =>
  state.value.days.filter(day => visibleDayKeys.includes(day.dayOfWeek as (typeof visibleDayKeys)[number]))
)
const isFormHydrating = computed(() => props.loadingFields)
type SelectOptionValue = string | { value?: string, label?: string } | null | undefined

function resolveSelectValue(value: SelectOptionValue) {
  return typeof value === 'string'
    ? value
    : value?.value ?? ''
}

const selectedMenuType = computed({
  get: () => state.value.menuType,
  set: (value: SelectOptionValue) => {
    const nextValue = resolveSelectValue(value)
    state.value.menuType = nextValue === 'VEGETARIANO' ? 'VEGETARIANO' : 'ESTANDAR'
  }
})
const selectedMenuTypeIcon = computed(
  () => menuTypeOptions.find(option => option.value === selectedMenuType.value)?.icon ?? 'i-lucide-utensils'
)
const slotValidationSchema = z.object({
  days: z.array(z.any())
}).superRefine((value, ctx) => {
  value.days.forEach((day, dayIndex) => {
    SLOT_ORDER.forEach((slotKey) => {
      const slot = day[slotKey]

      if (!slot?.platilloPrincipal?.catalogItemId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days', dayIndex, slotKey, 'platilloPrincipal'],
          message: 'Selecciona un platillo principal.'
        })
      }

      if (!slot?.contenedor?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['days', dayIndex, slotKey, 'contenedor'],
          message: 'Selecciona un contenedor.'
        })
      }
    })
  })
})

function stringToDateValue(value: string) {
  if (!value) {
    return undefined
  }

  const [year, month, day] = value.split('-').map(Number)

  if (!year || !month || !day) {
    return undefined
  }

  return new CalendarDate(year, month, day)
}

function dateValueToString(value: DateValue | null | undefined) {
  if (!value) {
    return ''
  }

  return `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
}

const startDateValue = computed({
  get: () => stringToDateValue(state.value.startDate),
  set: (value: DateValue | null | undefined) => {
    state.value.startDate = dateValueToString(value)
  }
})

const endDateValue = computed({
  get: () => stringToDateValue(state.value.endDate),
  set: (value: DateValue | null | undefined) => {
    state.value.endDate = dateValueToString(value)
  }
})

function formatDateLabel(value: DateValue | null | undefined, fallback: string) {
  return value ? dateFormatter.format(value.toDate(timeZone)) : fallback
}

watch(
  () => props.menu,
  (menu) => {
    state.value = createMenuFormState(menu)
    initialSnapshot.value = JSON.stringify(createMenuFormState(menu))

    if (!openDayKeys.value.length && visibleDays.value.length) {
      openDayKeys.value = [visibleDays.value[0]!.dayOfWeek]
    }
  },
  { immediate: true }
)

const canSubmit = computed(() =>
  Boolean(
    state.value.name.trim()
    && state.value.startDate
    && state.value.endDate
    && slotValidationResult.value.success
  )
)
const hasUnsavedChanges = computed(() => JSON.stringify(state.value) !== initialSnapshot.value)
const slotValidationResult = computed(() =>
  slotValidationSchema.safeParse({
    days: visibleDays.value.map(day => ({
      dayOfWeek: day.dayOfWeek,
      desayuno: day.desayuno,
      comida: day.comida,
      cena: day.cena,
      snack1: day.snack1,
      snack2: day.snack2
    }))
  })
)
const slotFieldErrors = computed(() => {
  const errors: Record<string, string> = {}

  if (slotValidationResult.value.success) {
    return errors
  }

  slotValidationResult.value.error.issues.forEach((issue) => {
    const [_, dayIndex, slotKey, fieldKey] = issue.path

    if (typeof dayIndex !== 'number' || typeof slotKey !== 'string' || typeof fieldKey !== 'string') {
      return
    }

    const day = visibleDays.value[dayIndex]

    if (!day) {
      return
    }

    errors[`${day.dayOfWeek}.${slotKey}.${fieldKey}`] = issue.message
  })

  return errors
})

function countConfiguredSlots(day: WeeklyMenuFormState['days'][number]) {
  return SLOT_ORDER.reduce((count, slotKey) => count + (slotHasContent(day[slotKey]) ? 1 : 0), 0)
}

function isDayCompleted(day: WeeklyMenuFormState['days'][number]) {
  return countConfiguredSlots(day) === SLOT_ORDER.length
}

function slotHasContent(slot: MenuSlot) {
  return Boolean(
    slot.platilloPrincipal.nombre.trim()
    || slot.guarnicion1?.nombre?.trim()
    || slot.guarnicion2?.nombre?.trim()
    || slot.contenedor?.trim()
    || slot.adicionales.length
  )
}

function isDayOpen(dayOfWeek: WeeklyMenuFormState['days'][number]['dayOfWeek']) {
  return openDayKeys.value.includes(dayOfWeek)
}

function toggleDay(dayOfWeek: WeeklyMenuFormState['days'][number]['dayOfWeek']) {
  openDayKeys.value = isDayOpen(dayOfWeek)
    ? openDayKeys.value.filter(value => value !== dayOfWeek)
    : [...openDayKeys.value, dayOfWeek]
}

function buildPayload() {
  return {
    name: state.value.name.trim(),
    menuType: state.value.menuType,
    startDate: state.value.startDate,
    endDate: state.value.endDate,
    days: state.value.days.map(day => ({
      dayOfWeek: day.dayOfWeek,
      desayuno: cloneSlot(day.desayuno),
      comida: cloneSlot(day.comida),
      cena: cloneSlot(day.cena),
      snack1: cloneSlot(day.snack1),
      snack2: cloneSlot(day.snack2)
    }))
  }
}

function getSlotError(dayOfWeek: WeeklyMenuFormState['days'][number]['dayOfWeek'], slotKey: typeof SLOT_ORDER[number], field: 'platilloPrincipal' | 'contenedor') {
  if (!hasTriedSubmit.value) {
    return undefined
  }

  return slotFieldErrors.value[`${dayOfWeek}.${slotKey}.${field}`]
}

watch(hasUnsavedChanges, value => emit('dirty-change', value), { immediate: true })
watch(canSubmit, value => emit('validity-change', value), { immediate: true })
watch(isSubmitting, value => emit('submit-state-change', value), { immediate: true })

async function onSubmit() {
  if (isSubmitting.value) {
    return
  }

  hasTriedSubmit.value = true

  if (!slotValidationResult.value.success) {
    toast.add({
      title: 'No se pudo guardar el menu',
      description: 'No se pudo guardar el menú porque hay un campo que quedó sin llenar.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
    return
  }

  isSubmitting.value = true

  try {
    await saveMenu(buildPayload(), props.menu?.id)
    initialSnapshot.value = JSON.stringify(state.value)
    toast.add({
      title: props.mode === 'edit' ? 'Menú actualizado' : 'Menú creado',
      description: props.mode === 'edit'
        ? 'La rotación semanal ya quedó actualizada.'
        : 'El nuevo menú semanal ya quedó guardado.',
      color: 'success',
      icon: 'i-lucide-check-circle'
    })
    emit('saved')
  } catch (error) {
    toast.add({
      title: 'No se pudo guardar el menu',
      description: 'No se pudo guardar el menú porque hay un campo que quedó sin llenar.',
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form :id="formId" class="space-y-6" @submit.prevent="onSubmit">
    <UCard
      :ui="{
        root: 'overflow-hidden rounded-2xl border border-default/70 ring-0 divide-y-0 bg-elevated/35 shadow-sm shadow-black/5',
        body: 'space-y-5 p-6'
      }"
    >
      <h2 class="text-xl font-semibold text-primary">
        Información general del menú
      </h2>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px_220px]">
        <UFormField label="Nombre del menú" class="min-w-0">
          <UInput
            v-model="state.name"
            class="w-full"
            size="xl"
            :disabled="isFormHydrating"
            :placeholder="isFormHydrating ? 'Cargando...' : 'Ej. Semana del 15 al 21 de abril'"
          />
        </UFormField>

        <UFormField label="Tipo de menú">
          <USelectMenu
            v-model="selectedMenuType"
            :items="menuTypeOptions"
            label-key="label"
            value-key="value"
            class="w-full"
            color="primary"
            size="xl"
            :icon="selectedMenuTypeIcon"
            :disabled="isFormHydrating"
            :placeholder="isFormHydrating ? 'Cargando...' : 'Selecciona tipo'"
          />
        </UFormField>

        <UFormField label="Fecha de inicio">
          <UPopover :content="{ align: 'start' }">
            <UButton
              color="neutral"
              variant="outline"
              size="xl"
              icon="i-lucide-calendar"
              class="w-full justify-between"
              :disabled="isFormHydrating"
            >
              {{ isFormHydrating ? 'Cargando...' : formatDateLabel(startDateValue, 'Selecciona fecha') }}

              <template #trailing>
                <UIcon name="i-lucide-chevron-down" class="size-5 text-dimmed" />
              </template>
            </UButton>

            <template #content>
              <UCalendar v-model="startDateValue" class="p-2" />
            </template>
          </UPopover>
        </UFormField>

        <UFormField label="Fecha de cierre">
          <UPopover :content="{ align: 'start' }">
            <UButton
              color="neutral"
              variant="outline"
              size="xl"
              icon="i-lucide-calendar"
              class="w-full justify-between"
              :disabled="isFormHydrating"
            >
              {{ isFormHydrating ? 'Cargando...' : formatDateLabel(endDateValue, 'Selecciona fecha') }}

              <template #trailing>
                <UIcon name="i-lucide-chevron-down" class="size-5 text-dimmed" />
              </template>
            </UButton>

            <template #content>
              <UCalendar v-model="endDateValue" class="p-2" />
            </template>
          </UPopover>
        </UFormField>
      </div>

      <div class="flex md:justify-end">
        <UButton
          v-if="!hideSubmit"
          type="submit"
          size="lg"
          icon="i-lucide-save"
          :loading="isSubmitting"
          :disabled="!canSubmit"
        >
          {{ mode === 'edit' ? 'Guardar cambios' : 'Crear menú' }}
        </UButton>
      </div>
    </UCard>

    <div class="space-y-4">
      <section
        v-for="day in visibleDays"
        :key="day.dayOfWeek"
        class="overflow-hidden rounded-2xl border border-default/70 bg-elevated/35 shadow-sm shadow-black/5"
      >
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-default/70 px-5 py-4 text-left"
          @click="toggleDay(day.dayOfWeek)"
        >
          <UBadge color="primary" variant="soft">
            {{ day.dayOfWeek }}
          </UBadge>

          <div
            v-if="isDayCompleted(day)"
            class="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <UIcon name="i-lucide-check" class="size-4" />
            <span>Completado</span>
          </div>
          <p v-else class="text-sm text-muted">
            {{ countConfiguredSlots(day) }} de {{ SLOT_ORDER.length }} tiempos configurados.
          </p>
        </button>

        <div v-if="isDayOpen(day.dayOfWeek)" class="space-y-4 p-5">
          <div class="grid gap-4 lg:grid-cols-3">
            <AdminMenuSlotEditor
              v-for="slotKey in primarySlotKeys"
              :key="`${day.dayOfWeek}-${slotKey}`"
              v-model="day[slotKey]"
              :title="SLOT_LABELS[slotKey]"
              :catalog-items="catalogItems"
              :main-types="slotKey === 'desayuno' ? ['desayuno'] : ['comida', 'cena']"
              :side-types="['guarnicion']"
              :additional-types="['guarnicion', 'ramekin']"
              :loading="loadingSlots"
              :main-error="getSlotError(day.dayOfWeek, slotKey, 'platilloPrincipal')"
              :container-error="getSlotError(day.dayOfWeek, slotKey, 'contenedor')"
            />
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <AdminMenuSlotEditor
              v-for="slotKey in secondarySlotKeys"
              :key="`${day.dayOfWeek}-${slotKey}`"
              v-model="day[slotKey]"
              :title="SLOT_LABELS[slotKey]"
              :catalog-items="catalogItems"
              :main-types="['snack']"
              :additional-types="['guarnicion', 'ramekin']"
              :loading="loadingSlots"
              :main-error="getSlotError(day.dayOfWeek, slotKey, 'platilloPrincipal')"
              :container-error="getSlotError(day.dayOfWeek, slotKey, 'contenedor')"
              additional-label="Ramekin"
              additional-placeholder="Selecciona ramekin"
              empty-additional-text="Sin ramekin capturado para este snack."
              add-additional-text="Agregar ramekin"
              hide-sides
            />
          </div>
        </div>
      </section>
    </div>
  </form>
</template>
