<script setup lang="ts">
import type { AdminOrderFormData } from '~~/types/types'

const props = withDefaults(defineProps<{
  formData: AdminOrderFormData
  isLoading?: boolean
  loadError?: { message?: string } | null
}>(), {
  isLoading: false,
  loadError: null
})

const route = useRoute()
const leaveConfirmOpen = ref(false)
const formId = 'admin-order-create-form'

const {
  hasUnsavedChanges,
  isSubmitting,
  canSubmit,
  submitButtonColor,
  submitButtonVariant,
  onDirtyChange,
  onValidityChange,
  onSubmitStateChange
} = useEditorState({ isLoading: computed(() => props.isLoading) })

async function onSaved() {
  if (typeof route.query.returnTo === 'string') {
    await navigateTo(route.query.returnTo)
    return
  }

  await navigateTo('/pedidos')
}

async function onBack() {
  if (hasUnsavedChanges.value) {
    leaveConfirmOpen.value = true
    return
  }

  await navigateTo('/pedidos')
}

async function leaveWithoutSaving() {
  leaveConfirmOpen.value = false
  await navigateTo('/pedidos')
}
</script>

<template>
  <AdminEditorPageShell
    title="Nuevo pedido"
    description="Captura el pedido con el mismo flujo editorial del panel: cliente, menú, entrega, planes y ajustes finales."
  >
    <template #actions>
      <UButton
        color="neutral"
        variant="subtle"
        icon="i-lucide-arrow-left"
        class="cursor-pointer"
        @click="onBack"
      >
        Volver a pedidos
      </UButton>

      <UButton
        type="submit"
        :form="formId"
        :disabled="isLoading || !canSubmit"
        :color="submitButtonColor"
        :variant="submitButtonVariant"
        class="relative justify-center cursor-pointer"
      >
        <span class="inline-flex items-center gap-2 opacity-0">
          <UIcon name="i-lucide-save" class="size-4" />
          Crear pedido
        </span>
        <span class="absolute inset-0 flex items-center justify-center gap-2">
          <UIcon
            :name="isSubmitting ? 'i-lucide-loader-circle' : 'i-lucide-save'"
            :class="['size-4', isSubmitting ? 'animate-spin' : '']"
          />
          <span>
            {{ isSubmitting ? 'Guardando...' : 'Crear pedido' }}
          </span>
        </span>
      </UButton>
    </template>

    <div v-if="loadError" class="space-y-4">
      <UAlert
        title="No se pudo preparar el formulario"
        :description="loadError.message || 'Intenta recargar la página en un momento.'"
        color="error"
        variant="soft"
        icon="i-lucide-circle-alert"
      />
    </div>

    <div v-else-if="isLoading" class="space-y-6">
      <UCard
        v-for="placeholder in 3"
        :key="`order-editor-skeleton-${placeholder}`"
        :ui="{
          root: 'overflow-hidden rounded-[28px] border border-default/70 ring-0 divide-y-0 bg-elevated/40 shadow-sm shadow-black/5 backdrop-blur-sm',
          body: 'space-y-6 p-6 sm:p-7'
        }"
      >
        <div class="space-y-2">
          <div class="h-4 w-32 animate-pulse rounded-md bg-elevated" />
          <div class="h-6 w-56 animate-pulse rounded-md bg-elevated" />
          <div class="h-4 w-full animate-pulse rounded-md bg-elevated" />
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div
            v-for="field in 3"
            :key="`order-editor-field-${placeholder}-${field}`"
            class="space-y-2"
          >
            <div class="h-4 w-24 animate-pulse rounded-md bg-elevated" />
            <div class="h-11 animate-pulse rounded-xl bg-elevated" />
          </div>
        </div>
      </UCard>
    </div>

    <AdminOrderForm
      v-else
      :form-id="formId"
      :form-data="formData"
      hide-submit
      @saved="onSaved"
      @dirty-change="onDirtyChange"
      @validity-change="onValidityChange"
      @submit-state-change="onSubmitStateChange"
    />
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
