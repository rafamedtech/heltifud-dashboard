<script setup lang="ts">
import type { FoodCatalogItem, MenuSlot } from '~~/types/types'
import { createEmptyFoodItem, createFoodItemFromCatalog } from '~/utils/heltifud'

const props = defineProps<{
  title: string
  catalogItems: FoodCatalogItem[]
  hideSides?: boolean
  mainTypes?: string[]
  sideTypes?: string[]
  additionalTypes?: string[]
  loading?: boolean
  mainError?: string
  containerError?: string
  additionalLabel?: string
  additionalPlaceholder?: string
  emptyAdditionalText?: string
  addAdditionalText?: string
}>()

const slotState = defineModel<MenuSlot>({ required: true })

function normalizeType(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('es-MX')
}

const TYPE_ALIASES: Record<string, string[]> = {
  desayuno: ['desayuno', 'desayunos'],
  comida: ['comida', 'comidas', 'proteina', 'proteinas', 'plato fuerte', 'platos fuertes', 'almuerzo'],
  cena: ['cena', 'cenas', 'proteina', 'proteinas', 'plato fuerte', 'platos fuertes'],
  guarnicion: ['guarnicion', 'guarniciones', 'acompanamiento', 'acompanamientos', 'side', 'sides'],
  ramekin: ['ramekin', 'ramekines', 'aderezo', 'aderezos', 'salsa', 'salsas', 'dip', 'dips'],
  snack: ['snack', 'snacks', 'colacion', 'colaciones']
}

const containerOptions = [
  { label: 'Sin división (28oz)', value: 'Sin división (28oz)' },
  { label: 'Sin división (38oz)', value: 'Sin división (38oz)' },
  { label: 'Sin división (12oz)', value: 'Sin división (12oz)' },
  { label: '2 divisiones (30oz)', value: '2 divisiones (30oz)' },
  { label: 'Redondo (32oz)', value: 'Redondo (32oz)' },
  { label: 'Redondo (24oz)', value: 'Redondo (24oz)' }
]

function matchesAllowedTypes(itemType: string, allowedTypes?: string[]) {
  if (!allowedTypes?.length) {
    return true
  }

  const normalizedItemType = normalizeType(itemType)

  return allowedTypes.some((allowedType) => {
    const normalizedAllowedType = normalizeType(allowedType)
    const aliases = TYPE_ALIASES[normalizedAllowedType] ?? [normalizedAllowedType]

    return aliases.includes(normalizedItemType)
  })
}

function toOptions(items: FoodCatalogItem[]) {
  return items.map(item => ({
    label: item.nombre,
    value: item.id
  }))
}

function getFilteredItems(allowedTypes?: string[], selectedId?: string) {
  return props.catalogItems.filter((item) => {
    if (selectedId && item.id === selectedId) {
      return true
    }

    return matchesAllowedTypes(item.tipo, allowedTypes)
  })
}

const mainOptions = computed(() => toOptions(getFilteredItems(props.mainTypes, getMainValue())))
const sideOptions = computed(() => toOptions(getFilteredItems(props.sideTypes)))

function getAdditionalOptions(selectedId?: string) {
  return toOptions(getFilteredItems(props.additionalTypes, selectedId))
}

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

const totalCalories = computed(() => {
  const main = slotState.value.platilloPrincipal.calorias || 0
  const side1 = slotState.value.guarnicion1?.calorias || 0
  const side2 = slotState.value.guarnicion2?.calorias || 0
  const additionals = slotState.value.adicionales.reduce((sum, item) => sum + (item.calorias || 0), 0)

  return main + side1 + side2 + additionals
})
</script>

<template>
  <article class="app-surface space-y-4 p-4">
    <div class="flex items-center justify-between gap-3">
      <h4 class="text-base font-semibold text-primary">
        {{ title }}
      </h4>
      <UBadge color="neutral" variant="subtle">
        {{ totalCalories }} kcal
      </UBadge>
    </div>

    <div class="space-y-4">
      <UFormField label="Platillo principal" :error="mainError || false">
        <USelectMenu
          class="w-full"
          :model-value="getMainValue()"
          :items="mainOptions"
          label-key="label"
          value-key="value"
          :color="mainError ? 'error' : 'primary'"
          :highlight="Boolean(mainError)"
          :disabled="loading"
          :placeholder="loading ? 'Cargando...' : 'Selecciona un platillo'"
          :search-input="{ placeholder: 'Buscar...' }"
          @update:model-value="updateMainDish"
        />
      </UFormField>

      <div v-if="!hideSides" class="grid gap-4 xl:grid-cols-2">
        <UFormField label="Guarnición 1">
          <USelectMenu
            class="w-full"
            :model-value="getSideValue('guarnicion1')"
            :items="sideOptions"
            label-key="label"
            value-key="value"
            color="primary"
            :disabled="loading"
            :placeholder="loading ? 'Cargando...' : 'Selecciona un platillo'"
            :search-input="{ placeholder: 'Buscar...' }"
            @update:model-value="(value) => updateSideDish('guarnicion1', value)"
          />
        </UFormField>

        <UFormField label="Guarnición 2">
          <USelectMenu
            class="w-full"
            :model-value="getSideValue('guarnicion2')"
            :items="sideOptions"
            label-key="label"
            value-key="value"
            color="primary"
            :disabled="loading"
            :placeholder="loading ? 'Cargando...' : 'Selecciona un platillo'"
            :search-input="{ placeholder: 'Buscar...' }"
            @update:model-value="(value) => updateSideDish('guarnicion2', value)"
          />
        </UFormField>
      </div>

      <UFormField label="Contenedor" :error="containerError || false">
        <USelectMenu
          v-model="containerValue"
          class="w-full"
          :items="containerOptions"
          label-key="label"
          value-key="value"
          :color="containerError ? 'error' : 'primary'"
          :highlight="Boolean(containerError)"
          :disabled="loading"
          :placeholder="loading ? 'Cargando...' : 'Selecciona un contenedor'"
          :search-input="{ placeholder: 'Buscar...' }"
        />
      </UFormField>

      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm font-medium text-highlighted">
            {{ additionalLabel || 'Adicionales' }}
          </p>
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-plus"
            :disabled="loading"
            @click="addAdditional"
          >
            {{ addAdditionalText || 'Agregar' }}
          </UButton>
        </div>

        <div v-if="slotState.adicionales.length" class="space-y-3">
          <div
            v-for="(adicional, index) in slotState.adicionales"
            :key="`${title}-adicional-${index}`"
            class="flex items-center gap-3"
          >
            <USelectMenu
              class="flex-1"
              :model-value="adicional.catalogItemId ?? undefined"
              :items="getAdditionalOptions(adicional.catalogItemId ?? undefined)"
              label-key="label"
              value-key="value"
              color="primary"
              :disabled="loading"
              :placeholder="loading ? 'Cargando...' : (additionalPlaceholder || 'Selecciona un platillo')"
              :search-input="{ placeholder: 'Buscar...' }"
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
          {{ loading ? 'Cargando...' : (emptyAdditionalText || 'Sin adicionales capturados para este tiempo.') }}
        </p>
      </div>
    </div>
  </article>
</template>
