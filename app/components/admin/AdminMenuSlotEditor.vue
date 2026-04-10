<script setup lang="ts">
import type { FoodCatalogItem, MenuSlot } from '~~/types/types'
import { createEmptyFoodItem, createFoodItemFromCatalog } from '~/utils/heltifud'

const props = defineProps<{
  title: string
  catalogItems: FoodCatalogItem[]
}>()

const slotState = defineModel<MenuSlot>({ required: true })

const options = computed(() =>
  props.catalogItems.map(item => ({
    label: `${item.nombre} (${item.tipo})`,
    value: item.id
  }))
)

function getItemById(id: string) {
  return props.catalogItems.find(item => item.id === id)
}

function getMainValue() {
  return slotState.value.platilloPrincipal.catalogItemId ?? undefined
}

function getSideValue(key: 'guarnicion1' | 'guarnicion2') {
  return slotState.value[key]?.catalogItemId ?? undefined
}

function updateMainDish(id?: string) {
  slotState.value.platilloPrincipal = id ? createFoodItemFromCatalog(getItemById(id)) : createEmptyFoodItem()
}

function updateSideDish(key: 'guarnicion1' | 'guarnicion2', id?: string) {
  slotState.value[key] = id ? createFoodItemFromCatalog(getItemById(id)) : null
}

function addAdditional() {
  slotState.value.adicionales.push(createEmptyFoodItem())
}

function updateAdditional(index: number, id?: string) {
  if (!id) {
    slotState.value.adicionales.splice(index, 1)
    return
  }

  slotState.value.adicionales[index] = createFoodItemFromCatalog(getItemById(id))
}

const containerValue = computed({
  get: () => slotState.value.contenedor ?? '',
  set: (value: string) => {
    slotState.value.contenedor = value
  }
})
</script>

<template>
  <article class="app-surface-soft space-y-4 p-4">
    <div class="space-y-1">
      <div class="flex items-center justify-between gap-3">
        <h4 class="text-base font-semibold text-highlighted">
          {{ title }}
        </h4>
        <UBadge color="neutral" variant="subtle">
          {{ slotState.platilloPrincipal.calorias || 0 }} kcal
        </UBadge>
      </div>
      <p class="text-sm text-muted">
        Selecciona el platillo principal y, si aplica, agrega guarniciones o adicionales desde tu catálogo.
      </p>
    </div>

    <div class="space-y-4">
      <UFormField label="Platillo principal">
        <USelect
          :model-value="getMainValue()"
          :items="options"
          placeholder="Selecciona un platillo"
          @update:model-value="updateMainDish"
        />
      </UFormField>

      <div class="grid gap-4 xl:grid-cols-2">
        <UFormField label="Guarnición 1">
          <USelect
            :model-value="getSideValue('guarnicion1')"
            :items="options"
            placeholder="Selecciona un platillo"
            @update:model-value="(value) => updateSideDish('guarnicion1', value)"
          />
        </UFormField>

        <UFormField label="Guarnición 2">
          <USelect
            :model-value="getSideValue('guarnicion2')"
            :items="options"
            placeholder="Selecciona un platillo"
            @update:model-value="(value) => updateSideDish('guarnicion2', value)"
          />
        </UFormField>
      </div>

      <UFormField label="Contenedor">
        <UInput v-model="containerValue" placeholder="Ej. Bowl kraft, charola grande, envase snack" />
      </UFormField>

      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-highlighted">
            Adicionales
          </p>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-plus"
            @click="addAdditional"
          >
            Agregar
          </UButton>
        </div>

        <div v-if="slotState.adicionales.length" class="space-y-3">
          <div
            v-for="(adicional, index) in slotState.adicionales"
            :key="`${title}-adicional-${index}`"
            class="flex items-center gap-3"
          >
            <USelect
              class="flex-1"
              :model-value="adicional.catalogItemId ?? undefined"
              :items="options"
              placeholder="Selecciona un platillo"
              @update:model-value="(value) => updateAdditional(index, value)"
            />
            <UButton
              color="error"
              variant="ghost"
              square
              icon="i-lucide-trash"
              @click="slotState.adicionales.splice(index, 1)"
            />
          </div>
        </div>

        <p v-else class="text-sm text-muted">
          Sin adicionales capturados para este tiempo.
        </p>
      </div>
    </div>
  </article>
</template>
