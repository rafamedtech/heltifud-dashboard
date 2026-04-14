<script setup lang="ts">
import type { FoodCatalogItemDetail } from '~~/types/types'

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

const route = useRoute()
const toast = useToast()
const { navigateBack } = useRouteBackNavigation()
const returnTo = computed(() =>
  typeof route.query.returnTo === 'string' ? route.query.returnTo : undefined
)
const backTo = computed(() => returnTo.value ?? '/platillos')
const leaveConfirmOpen = ref(false)
const deleteConfirmOpen = ref(false)
const deleteBlockedState = ref<DeleteBlockedModalState | null>(null)
const isDeleting = ref(false)
const editFormId = 'food-catalog-edit-form'

useSeoMeta({
  title: 'Gestión de platillos | Editar platillo | Heltifud Meal Preps',
  description:
    'Edita un platillo existente dentro del catálogo reutilizable del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

const {
  data: item,
  status,
  error
} = useLazyFetch<FoodCatalogItemDetail>(
  `/api/food-components/${route.params.id}`,
  {
    key: `food-catalog-${route.params.id}`
  }
)

const isLoading = computed(
  () => status.value === 'idle' || status.value === 'pending'
)
const {
  hasUnsavedChanges,
  isSubmitting,
  canSubmit,
  submitButtonColor,
  submitButtonVariant,
  onDirtyChange,
  onValidityChange,
  onSubmitStateChange
} = useFoodCatalogEditorState({ isLoading })
const { deleteFoodCatalogItem } = useFoodCatalog()
const isDeleteBlockedModalOpen = computed({
  get: () => Boolean(deleteBlockedState.value),
  set: (value) => {
    if (!value) {
      deleteBlockedState.value = null
    }
  }
})
const deleteConfirmDescription = computed(() =>
  item.value
    ? `Se eliminará "${item.value.nombre}". Esta acción no se puede deshacer.`
    : undefined
)

async function onSaved() {
  if (typeof route.query.returnTo === 'string') {
    await navigateTo(route.query.returnTo)
  }
}

async function onBack() {
  if (hasUnsavedChanges.value) {
    leaveConfirmOpen.value = true
    return
  }

  await navigateBack(backTo.value)
}

async function leaveWithoutSaving() {
  leaveConfirmOpen.value = false
  await navigateBack(backTo.value)
}

async function onDelete() {
  if (!item.value || isDeleting.value) {
    return
  }

  isDeleting.value = true

  try {
    await deleteFoodCatalogItem(item.value.id)
    toast.add({ title: 'Platillo eliminado', color: 'success', icon: 'i-lucide-check-circle' })
    deleteConfirmOpen.value = false
    await navigateTo(backTo.value)
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
        itemName: typeof data.itemName === 'string' ? data.itemName : item.value.nombre,
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
      deleteConfirmOpen.value = false
    } else {
      deleteConfirmOpen.value = false
      toast.add({
        title: 'No pudimos eliminar el platillo',
        description: 'No se pudo eliminar porque este platillo está siendo usado actualmente en un menú.',
        color: 'error',
        icon: 'i-lucide-circle-alert'
      })
    }
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <main class="space-y-6">
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      title="No se pudo cargar el platillo"
      :description="error.statusMessage || 'Intenta de nuevo en unos segundos.'"
      icon="i-lucide-circle-alert"
    />

    <template v-else>
      <section>
        <div
          class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        >
          <div class="max-w-sm space-y-2">
            <h1 class="text-3xl font-semibold tracking-tight text-primary">
              Editar platillo
            </h1>

            <p class="text-sm text-muted">
              Edita un platillo existente y conserva su información actualizada
              dentro del catálogo.
            </p>
          </div>

          <div class="flex items-center gap-3 md:justify-end">
            <UButton
              color="neutral"
              variant="subtle"
              icon="i-lucide-arrow-left"
              class="cursor-pointer"
              @click="onBack"
            >
              Regresar
            </UButton>

            <UButton
              type="submit"
              :form="editFormId"
              :disabled="!canSubmit"
              :color="submitButtonColor"
              :variant="submitButtonVariant"
              :icon="isSubmitting ? 'i-lucide-loader-circle' : 'i-lucide-save'"
              :loading="isSubmitting"
              class="min-w-[10.75rem] justify-center cursor-pointer"
            >
              {{ isSubmitting ? 'Guardando...' : 'Guardar cambios' }}
            </UButton>
          </div>
        </div>
      </section>

      <div class="mx-auto w-full max-w-6xl">
        <AdminFoodCatalogForm
          :form-id="editFormId"
          hide-submit
          :item="item"
          :loading-fields="isLoading"
          :loading-sidebar="isLoading"
          mode="edit"
          @saved="onSaved"
          @dirty-change="onDirtyChange"
          @validity-change="onValidityChange"
          @submit-state-change="onSubmitStateChange"
        />

        <UCard class="app-surface mt-6" :ui="{ body: 'p-5 sm:p-6' }">
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="space-y-1">
              <h2 class="text-xl font-semibold text-error">
                Eliminar platillo
              </h2>
              <p class="max-w-sm text-sm text-muted">
                Elimina este platillo del catálogo si ya no debe seguir disponible para futuras selecciones.
              </p>
            </div>

            <UButton
              color="error"
              variant="subtle"
              icon="i-lucide-trash"
              class="cursor-pointer"
              @click="deleteConfirmOpen = true"
            >
              Eliminar platillo
            </UButton>
          </div>
        </UCard>
      </div>

      <UModal
        v-model:open="leaveConfirmOpen"
        title="Salir sin guardar"
        description="Tienes cambios sin guardar. Si sales ahora, se perderán."
      >
        <template #body>
          <p class="text-sm text-muted">
            ¿Quieres regresar de todos modos?
          </p>
        </template>

        <template #footer>
          <div
            class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end"
          >
            <UButton
              color="neutral"
              variant="ghost"
              block
              class="cursor-pointer sm:w-auto"
              @click="leaveConfirmOpen = false"
            >
              Seguir editando
            </UButton>
            <UButton
              color="warning"
              icon="i-lucide-arrow-left"
              block
              class="cursor-pointer sm:w-auto"
              @click="leaveWithoutSaving"
            >
              Salir sin guardar
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="deleteConfirmOpen"
        title="Eliminar platillo"
        :description="deleteConfirmDescription"
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
              @click="deleteConfirmOpen = false"
            >
              Cancelar
            </UButton>

            <UButton
              color="error"
              :loading="isDeleting"
              @click="onDelete"
            >
              {{ isDeleting ? 'Eliminando...' : 'Eliminar platillo' }}
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal
        v-model:open="isDeleteBlockedModalOpen"
        title="Este platillo todavía no se puede eliminar"
        :ui="{ content: 'max-w-md' }"
      >
        <template #body>
          <div class="space-y-4">
            <p class="text-sm text-muted">
              Este platillo sigue vinculado a uno o más menús. Primero quítalo de esos menús y después vuelve a intentarlo.
            </p>

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
    </template>
  </main>
</template>
