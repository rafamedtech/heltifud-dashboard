<script setup lang="ts">
import type {
  AdminOrderPlanEditorSlotState,
  FoodCatalogItem,
  PlanSummary
} from '~~/types/types'
import { DAY_LABELS } from '~/utils/heltifud'

const props = withDefaults(defineProps<{
  plan: PlanSummary
  menuName: string
  menuRange?: string
  catalogItems: FoodCatalogItem[]
  requestedDishCount: number
  loading?: boolean
  mainErrorFor?: (slot: AdminOrderPlanEditorSlotState) => string | undefined
  containerErrorFor?: (slot: AdminOrderPlanEditorSlotState) => string | undefined
}>(), {
  menuRange: '',
  loading: false,
  mainErrorFor: undefined,
  containerErrorFor: undefined
})

const slots = defineModel<AdminOrderPlanEditorSlotState[]>({ required: true })
const openSelectionKeys = ref<number[]>([])

const mainTypes = computed(() =>
  props.plan.tipo === 'DESAYUNO' ? ['desayuno'] : ['comida', 'cena']
)
const sideTypes = ['guarnicion']
const additionalTypes = ['guarnicion', 'ramekin']
const completedCount = computed(() =>
  slots.value.filter(slot => isSelectionComplete(slot)).length
)

function isSelectionOpen(selectionIndex: number) {
  return openSelectionKeys.value.includes(selectionIndex)
}

function toggleSelection(selectionIndex: number) {
  openSelectionKeys.value = isSelectionOpen(selectionIndex)
    ? openSelectionKeys.value.filter(value => value !== selectionIndex)
    : [...openSelectionKeys.value, selectionIndex]
}

function getSelectionTitle(slot: AdminOrderPlanEditorSlotState) {
  return `Día ${slot.selectionIndex}`
}

function getSelectionDescription(slot: AdminOrderPlanEditorSlotState) {
  const cycle = Math.ceil(slot.selectionIndex / 5)

  if (cycle <= 1) {
    return DAY_LABELS[slot.dayOfWeek]
  }

  return `${DAY_LABELS[slot.dayOfWeek]} · vuelta ${cycle}`
}

function getSelectionCalories(slot: AdminOrderPlanEditorSlotState) {
  return (
    (slot.slot.platilloPrincipal.calorias || 0)
    + (slot.slot.guarnicion1?.calorias || 0)
    + (slot.slot.guarnicion2?.calorias || 0)
    + slot.slot.adicionales.reduce((sum, item) => sum + (item.calorias || 0), 0)
  )
}

function isSelectionComplete(slot: AdminOrderPlanEditorSlotState) {
  return Boolean(
    slot.slot.platilloPrincipal.catalogItemId
    && slot.slot.contenedor?.trim()
  )
}

watch(
  () => slots.value.map(slot => slot.selectionIndex),
  (selectionIndexes) => {
    if (!selectionIndexes.length) {
      openSelectionKeys.value = []
      return
    }

    openSelectionKeys.value = openSelectionKeys.value.filter(value =>
      selectionIndexes.includes(value)
    )

    if (!openSelectionKeys.value.length) {
      openSelectionKeys.value = [selectionIndexes[0]!]
    }
  },
  { immediate: true }
)
</script>

<template>
  <section class="space-y-4 rounded-[28px] border border-default/70 bg-elevated/35 p-5 shadow-sm shadow-black/5 sm:p-6">
    <div class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="space-y-2">
        <div class="flex flex-wrap items-center gap-2">
          <UBadge color="primary" variant="soft">
            {{ plan.nombre }}
          </UBadge>
          <UBadge color="neutral" variant="subtle">
            {{ requestedDishCount }} {{ requestedDishCount === 1 ? 'día' : 'días' }}
          </UBadge>
          <UBadge :color="completedCount === requestedDishCount ? 'success' : 'warning'" variant="subtle">
            {{ completedCount }} / {{ requestedDishCount }} listos
          </UBadge>
        </div>

        <div class="space-y-1">
          <h3 class="text-lg font-semibold text-primary">
            Menú resuelto para {{ menuName }}
          </h3>
          <p class="text-sm leading-6 text-muted">
            Edita el pedido día por día siguiendo el menú base del cliente. {{ menuRange }}
          </p>
        </div>
      </div>

      <div class="rounded-2xl border border-default/60 bg-default/30 px-4 py-3 text-sm text-muted">
        Sólo se muestra el tiempo correspondiente al plan <span class="font-medium text-highlighted">{{ plan.tipo.toLocaleLowerCase('es-MX') }}</span>.
      </div>
    </div>

    <div class="space-y-4">
      <section
        v-for="slotEntry in slots"
        :key="`${plan.id}-${slotEntry.selectionIndex}`"
        class="overflow-hidden rounded-2xl border border-default/70 bg-default/20"
      >
        <button
          type="button"
          class="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-default/70 px-5 py-4 text-left"
          @click="toggleSelection(slotEntry.selectionIndex)"
        >
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <UBadge color="primary" variant="soft">
                {{ getSelectionTitle(slotEntry) }}
              </UBadge>
              <UBadge color="neutral" variant="subtle">
                {{ getSelectionDescription(slotEntry) }}
              </UBadge>
            </div>
            <p class="text-sm text-muted">
              {{ getSelectionCalories(slotEntry) }} kcal
            </p>
          </div>

          <div
            v-if="isSelectionComplete(slotEntry)"
            class="inline-flex items-center gap-2 text-sm font-medium text-primary"
          >
            <UIcon name="i-lucide-check" class="size-4" />
            <span>Listo</span>
          </div>
          <p v-else class="text-sm text-muted">
            Falta principal o contenedor
          </p>
        </button>

        <div v-if="isSelectionOpen(slotEntry.selectionIndex)" class="p-5">
          <AdminMenuSlotEditor
            v-model="slotEntry.slot"
            :title="getSelectionDescription(slotEntry)"
            :catalog-items="catalogItems"
            :main-types="mainTypes"
            :side-types="sideTypes"
            :additional-types="additionalTypes"
            :loading="loading"
            :main-error="mainErrorFor?.(slotEntry)"
            :container-error="containerErrorFor?.(slotEntry)"
          />
        </div>
      </section>
    </div>
  </section>
</template>
