<script setup lang="ts">
import type { FoodCatalogItem, MenuSlot, WeeklyMenu } from '~~/types/types'
import Skeleton from 'boneyard-js/vue'
import createSlotsBones from '~/bones/admin-menu-create-slots.bones.json'
import editFieldsBones from '~/bones/admin-menu-edit-fields.bones.json'
import editSlotsBones from '~/bones/admin-menu-edit-slots.bones.json'
import {
  DAY_LABELS,
  SLOT_LABELS,
  SLOT_ORDER,
  cloneSlot,
  createMenuFormState,
  type WeeklyMenuFormState
} from '~/utils/heltifud'
import { formatWeekRange } from '~/utils/formatters'

type SkeletonResponsiveBones = {
  breakpoints: Record<number, {
    name: string
    viewportWidth: number
    width: number
    height: number
    bones: Array<{
      x: number
      y: number
      w: number
      h: number
      r: number | string
      c?: boolean
    }>
  }>
}

const props = withDefaults(defineProps<{
  menu?: WeeklyMenu | null
  catalogItems: FoodCatalogItem[]
  loadingFields?: boolean
  loadingSlots?: boolean
  mode?: 'create' | 'edit'
}>(), {
  menu: null,
  loadingFields: false,
  loadingSlots: false,
  mode: 'create'
})

const emit = defineEmits<{
  saved: []
}>()

const route = useRoute()
const toast = useToast()
const { saveMenu } = useMenu()

const state = ref<WeeklyMenuFormState>(createMenuFormState(props.menu))
const errorMessage = ref('')
const isSubmitting = ref(false)

watch(
  () => props.menu,
  (menu) => {
    state.value = createMenuFormState(menu)
  },
  { immediate: true }
)

const returnToCatalog = computed(() => `/platillos?returnTo=${encodeURIComponent(route.fullPath)}`)
const fieldsSkeletonName = computed(() => props.mode === 'edit' ? 'admin-menu-edit-fields' : undefined)
const fieldsInitialBones = computed(() =>
  props.mode === 'edit'
    ? editFieldsBones as unknown as SkeletonResponsiveBones
    : undefined
)
const slotsSkeletonName = computed(() => props.mode === 'edit' ? 'admin-menu-edit-slots' : 'admin-menu-create-slots')
const slotsInitialBones = computed(() =>
  (props.mode === 'edit' ? editSlotsBones : createSlotsBones) as unknown as SkeletonResponsiveBones
)

function countConfiguredSlots(day: WeeklyMenuFormState['days'][number]) {
  return SLOT_ORDER.reduce((count, slotKey) => count + (slotHasContent(day[slotKey]) ? 1 : 0), 0)
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

function buildPayload() {
  return {
    name: state.value.name.trim(),
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

async function onSubmit() {
  if (isSubmitting.value) {
    return
  }

  errorMessage.value = ''
  isSubmitting.value = true

  try {
    await saveMenu(buildPayload(), props.menu?.id)
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
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo guardar el menú.'
    toast.add({
      title: 'Error al guardar',
      description: errorMessage.value,
      color: 'error',
      icon: 'i-lucide-circle-alert'
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <form class="space-y-6" @submit.prevent="onSubmit">
    <UCard class="app-surface" :ui="{ body: 'space-y-5 p-6' }">
      <div class="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-highlighted">
            {{ mode === 'edit' ? 'Editar menú semanal' : 'Nuevo menú semanal' }}
          </h2>
          <p class="max-w-2xl text-sm text-muted">
            Cada día usa platillos del catálogo. Entre semana el sistema exigirá un platillo principal por cada tiempo.
          </p>
        </div>

        <UButton
          :to="returnToCatalog"
          color="neutral"
          variant="outline"
          icon="i-lucide-chef-hat"
        >
          Administrar catálogo
        </UButton>
      </div>

      <UAlert
        v-if="!catalogItems.length"
        color="warning"
        variant="soft"
        icon="i-lucide-triangle-alert"
        title="Tu catálogo está vacío"
        description="Primero agrega platillos al catálogo para poder construir el menú semanal."
      />

      <UAlert
        v-if="errorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
        title="No se pudo guardar"
        :description="errorMessage"
      />

      <Skeleton
        :name="fieldsSkeletonName"
        :initial-bones="fieldsInitialBones"
        :loading="loadingFields"
      >
        <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
          <UFormField label="Nombre del menú" class="min-w-0">
            <UInput
              v-model="state.name"
              class="w-full"
              size="xl"
              placeholder="Ej. Semana del 15 al 21 de abril"
            />
          </UFormField>

          <UFormField label="Fecha de inicio">
            <UInput v-model="state.startDate" type="date" size="xl" />
          </UFormField>

          <UFormField label="Fecha de cierre">
            <UInput v-model="state.endDate" type="date" size="xl" />
          </UFormField>
        </div>

        <div class="flex flex-col gap-4 border-t border-default/70 pt-5 md:flex-row md:items-center md:justify-between">
          <div class="space-y-1 text-sm text-muted">
            <p>Ventana configurada: {{ formatWeekRange(state.startDate, state.endDate) }}</p>
            <p>{{ props.catalogItems.length }} platillos disponibles en el catálogo.</p>
          </div>

          <UButton
            type="submit"
            size="lg"
            icon="i-lucide-save"
            :loading="isSubmitting"
            :disabled="!catalogItems.length"
          >
            {{ mode === 'edit' ? 'Guardar cambios' : 'Crear menú' }}
          </UButton>
        </div>
      </Skeleton>
    </UCard>

    <Skeleton
      :name="slotsSkeletonName"
      :initial-bones="slotsInitialBones"
      :loading="loadingSlots"
    >
      <div class="space-y-4">
        <details
          v-for="(day, dayIndex) in state.days"
          :key="day.dayOfWeek"
          class="app-surface overflow-hidden"
          :open="dayIndex < 2"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-default/70 bg-elevated/40 px-5 py-4">
            <div class="space-y-1">
              <h3 class="text-lg font-semibold text-highlighted">
                {{ DAY_LABELS[day.dayOfWeek] }}
              </h3>
              <p class="text-sm text-muted">
                {{ countConfiguredSlots(day) }} de {{ SLOT_ORDER.length }} tiempos configurados.
              </p>
            </div>

            <UBadge color="primary" variant="soft">
              {{ day.dayOfWeek }}
            </UBadge>
          </summary>

          <div class="grid gap-4 p-5 xl:grid-cols-2">
            <AdminMenuSlotEditor
              v-for="slotKey in SLOT_ORDER"
              :key="`${day.dayOfWeek}-${slotKey}`"
              v-model="day[slotKey]"
              :title="SLOT_LABELS[slotKey]"
              :catalog-items="catalogItems"
            />
          </div>
        </details>
      </div>
    </Skeleton>
  </form>
</template>
