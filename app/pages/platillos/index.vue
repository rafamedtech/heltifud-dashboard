<script setup lang="ts">
import type { FoodCatalogItem } from '~~/types/types'

interface DeleteBlockedModalState {
  itemName: string
  linkedMenus: {
    id: string
    name: string
  }[]
}

type DeleteError = Error & {
  statusCode?: number
  data?: {
    code?: string
    itemName?: string
    linkedMenus?: unknown
  }
}

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
const toast = useToast()
const { navigateBack } = useRouteBackNavigation()
const deletingId = ref<string | null>(null)
const pendingDeleteItem = ref<FoodCatalogItem | null>(null)
const deleteBlockedState = ref<DeleteBlockedModalState | null>(null)

const {
  data: items,
  refresh,
  status
} = useFetch<FoodCatalogItem[]>('/api/food-components', {
  default: () => []
})

const isLoading = computed(() => status.value === 'idle' || status.value === 'pending')
const deleteModalDescription = computed(() =>
  pendingDeleteItem.value
    ? `Se eliminará "${pendingDeleteItem.value.nombre}". Esta acción no se puede deshacer.`
    : undefined
)
const isDeleteModalOpen = computed({
  get: () => Boolean(pendingDeleteItem.value),
  set: (value) => {
    if (!value) {
      pendingDeleteItem.value = null
    }
  }
})
const isDeleteBlockedModalOpen = computed({
  get: () => Boolean(deleteBlockedState.value),
  set: (value) => {
    if (!value) {
      deleteBlockedState.value = null
    }
  }
})
const deleteBlockedDescription = computed(() =>
  deleteBlockedState.value
    ? `"${deleteBlockedState.value.itemName}" todavía aparece en uno o más menús.`
    : undefined
)

const { deleteFoodCatalogItem } = useFoodCatalog()

const returnTo = computed(() => (typeof route.query.returnTo === 'string' ? route.query.returnTo : undefined))

async function onBack() {
  await navigateBack(returnTo.value ?? '/platillos')
}

function requestDelete(item: FoodCatalogItem) {
  pendingDeleteItem.value = item
}

async function onDelete(item: FoodCatalogItem) {
  deletingId.value = item.id

  try {
    await deleteFoodCatalogItem(item.id)
    await refresh()
    toast.add({ title: 'Platillo eliminado', color: 'success', icon: 'i-lucide-check-circle' })
  } catch (error) {
    const deleteError = error as DeleteError
    const statusCode = deleteError.statusCode
    const data = deleteError.data

    if (
      statusCode === 409
      && data
      && data.code === 'FOOD_CATALOG_ITEM_IN_USE'
    ) {
      deleteBlockedState.value = {
        itemName: typeof data.itemName === 'string' ? data.itemName : item.nombre,
        linkedMenus: Array.isArray(data.linkedMenus)
          ? data.linkedMenus.filter((menu): menu is { id: string, name: string } =>
              typeof menu === 'object'
              && menu !== null
              && 'id' in menu
              && 'name' in menu
              && typeof menu.id === 'string'
              && typeof menu.name === 'string')
          : []
      }
    } else {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el platillo.'
      toast.add({ title: 'Error', description: message, color: 'error', icon: 'i-lucide-circle-alert' })
    }
  } finally {
    deletingId.value = null
    pendingDeleteItem.value = null
  }
}

function editTo(item: FoodCatalogItem) {
  return { path: `/platillos/${item.id}`, query: returnTo.value ? { returnTo: returnTo.value } : {} }
}
</script>

<template>
  <main class="flex min-h-full flex-col space-y-6">
    <section class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="space-y-2">
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Platillos
          </h1>
          <p class="max-w-2xl text-sm text-muted">
            Administra el catálogo de platillos para los menús semanales.
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3 lg:justify-end">
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
    </section>

    <div class="mx-auto w-full max-w-5xl">
      <UCard
        class="app-surface flex-1 overflow-hidden"
        :ui="{ body: 'p-0 sm:p-0', header: 'p-0 sm:p-0', footer: 'p-0 sm:p-0' }"
      >
        <AdminFoodCatalogTable
          :items="items"
          :loading="isLoading"
          :deleting-id="deletingId"
          :edit-to="editTo"
          @delete="requestDelete"
        />
      </UCard>
    </div>

    <UModal
      v-model:open="isDeleteModalOpen"
      title="Eliminar platillo"
      :description="deleteModalDescription"
      :ui="{ content: 'max-w-md' }"
    >
      <template #body>
        <UAlert
          color="error"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Confirma esta acción"
          description="El platillo dejará de estar disponible para futuras selecciones en el catálogo."
        />
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            @click="pendingDeleteItem = null"
          >
            Cancelar
          </UButton>

          <UButton
            color="error"
            :loading="deletingId === pendingDeleteItem?.id"
            @click="pendingDeleteItem && onDelete(pendingDeleteItem)"
          >
            Eliminar platillo
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="isDeleteBlockedModalOpen"
      title="Este platillo no se puede borrar todavía"
      :description="deleteBlockedDescription"
      :ui="{ content: 'max-w-md' }"
    >
      <template #body>
        <div class="space-y-4">
          <UAlert
            color="warning"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="Primero quítalo de esos menús"
            description="Después de retirarlo de los menús donde aparece, ya lo podrás borrar sin problema."
          />

          <div
            v-if="deleteBlockedState?.linkedMenus?.length"
            class="space-y-2"
          >
            <p class="text-sm font-medium text-highlighted">
              Aparece en estos menús:
            </p>

            <ul class="space-y-2">
              <li
                v-for="menu in deleteBlockedState.linkedMenus"
                :key="menu.id"
                class="rounded-xl border border-default/70 bg-elevated/30 px-3 py-2 text-sm text-toned"
              >
                {{ menu.name }}
              </li>
            </ul>
          </div>
        </div>
      </template>

      <template #footer>
        <div class="flex w-full justify-end gap-3">
          <UButton
            color="neutral"
            variant="ghost"
            @click="deleteBlockedState = null"
          >
            Entendido
          </UButton>
        </div>
      </template>
    </UModal>
  </main>
</template>
