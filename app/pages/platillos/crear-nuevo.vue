<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth']
})

const route = useRoute()
const { navigateBack } = useRouteBackNavigation()
const returnTo = computed(() => (typeof route.query.returnTo === 'string' ? route.query.returnTo : undefined))
const backTo = computed(() => returnTo.value ?? '/platillos')
const hasUnsavedChanges = ref(false)
const leaveConfirmOpen = ref(false)
const createFormId = 'food-catalog-create-form'

useSeoMeta({
  title: 'Gestión de platillos | Crear nuevo platillo | Heltifud Meal Preps',
  description: 'Crea un nuevo platillo dentro del catálogo reutilizable del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow'
})

async function onSaved() {
  if (typeof route.query.returnTo === 'string') {
    await navigateTo(route.query.returnTo)
    return
  }

  await navigateTo('/platillos')
}

function onDirtyChange(value: boolean) {
  hasUnsavedChanges.value = value
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
  <main class="space-y-6">
    <section class="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div class="space-y-1">
        <h1 class="text-3xl font-semibold tracking-tight text-primary">
          Crear nuevo platillo
        </h1>
        <p class="max-w-2xl text-sm text-muted">
          Crea un nuevo platillo y guárdalo en el catálogo reusable para usarlo en los menús semanales.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3 xl:justify-end">
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
          :form="createFormId"
          :disabled="!hasUnsavedChanges"
          :color="hasUnsavedChanges ? 'primary' : 'neutral'"
          :variant="hasUnsavedChanges ? 'solid' : 'subtle'"
          icon="i-lucide-save"
          class="cursor-pointer"
        >
          Crear platillo
        </UButton>
      </div>
    </section>

    <div class="mx-auto w-full max-w-6xl">
      <AdminFoodCatalogForm
        :form-id="createFormId"
        hide-submit
        mode="create"
        @saved="onSaved"
        @dirty-change="onDirtyChange"
      />
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
  </main>
</template>
