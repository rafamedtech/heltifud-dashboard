<script setup lang="ts">
import type { FoodCatalogItem, WeeklyMenu } from '~~/types/types'

const props = withDefaults(defineProps<{
  menu?: WeeklyMenu | null
  catalogItems: FoodCatalogItem[]
  isLoading?: boolean
  mode?: 'create' | 'edit'
}>(), {
  menu: null,
  isLoading: false,
  mode: 'create'
})

const route = useRoute()
const { navigateBack } = useRouteBackNavigation()
const returnTo = computed(() => (typeof route.query.returnTo === 'string' ? route.query.returnTo : undefined))
const backTo = computed(() => returnTo.value ?? '/menu')
const leaveConfirmOpen = ref(false)
const formId = computed(() => props.mode === 'edit' ? 'menu-edit-form' : 'menu-create-form')
const pageTitle = computed(() => props.mode === 'edit' ? 'Editar menú' : 'Nuevo menú semanal')
const pageDescription = computed(() =>
  props.mode === 'edit'
    ? 'Ajusta platillos, contenedores y orden semanal sin perder coherencia del menú.'
    : 'Configura la semana en un orden simple: nombre, fechas y luego los platillos de cada día.'
)
const submitLabel = computed(() => props.mode === 'edit' ? 'Guardar cambios' : 'Crear menú')
const submitLoadingLabel = computed(() => props.mode === 'edit' ? 'Guardando...' : 'Guardando...')
const {
  hasUnsavedChanges,
  isSubmitting,
  canSubmit,
  submitButtonColor,
  submitButtonVariant,
  onDirtyChange,
  onValidityChange,
  onSubmitStateChange
} = useFoodCatalogEditorState({ isLoading: computed(() => props.isLoading) })

async function onSaved() {
  if (typeof route.query.returnTo === 'string') {
    await navigateTo(route.query.returnTo)
    return
  }

  await navigateTo('/menu')
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
</script>

<template>
  <AdminEditorPageShell
    :title="pageTitle"
    :description="pageDescription"
  >
    <template #actions>
      <UButton
        color="neutral"
        variant="subtle"
        icon="i-lucide-arrow-left"
        class="cursor-pointer"
        @click="onBack"
      >
        Volver a menús
      </UButton>

      <UButton
        type="submit"
        :form="formId"
        :disabled="!canSubmit"
        :color="submitButtonColor"
        :variant="submitButtonVariant"
        class="relative justify-center cursor-pointer"
      >
        <span class="inline-flex items-center gap-2 opacity-0">
          <UIcon name="i-lucide-save" class="size-4" />
          {{ submitLabel }}
        </span>
        <span class="absolute inset-0 flex items-center justify-center gap-2">
          <UIcon
            :name="isSubmitting ? 'i-lucide-loader-circle' : 'i-lucide-save'"
            :class="['size-4', isSubmitting ? 'animate-spin' : '']"
          />
          <span>{{ isSubmitting ? submitLoadingLabel : submitLabel }}</span>
        </span>
      </UButton>
    </template>

    <template #default>
      <AdminMenuForm
        :form-id="formId"
        :menu="menu"
        :catalog-items="catalogItems"
        :loading-fields="isLoading"
        :loading-slots="isLoading"
        :mode="mode"
        hide-submit
        @saved="onSaved"
        @dirty-change="onDirtyChange"
        @validity-change="onValidityChange"
        @submit-state-change="onSubmitStateChange"
      />
    </template>
  </AdminEditorPageShell>

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
      <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
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
</template>
