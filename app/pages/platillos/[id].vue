<script setup lang="ts">
import type { FoodCatalogItemDetail } from '~~/types/types';

definePageMeta({
  layout: 'admin',
  middleware: ['supabase-auth'],
});

const route = useRoute();
const returnTo = computed(() =>
  typeof route.query.returnTo === 'string' ? route.query.returnTo : undefined,
);
const backTo = computed(() => returnTo.value ?? '/platillos');
const hasUnsavedChanges = ref(false);
const leaveConfirmOpen = ref(false);
const editFormId = 'food-catalog-edit-form';

useSeoMeta({
  title: 'Gestión de platillos | Editar platillo | Heltifud Meal Preps',
  description:
    'Edita un platillo existente dentro del catálogo reutilizable del panel administrativo de Heltifud Meal Preps.',
  robots: 'noindex, nofollow',
});

const {
  data: item,
  status,
  error,
} = useLazyFetch<FoodCatalogItemDetail>(
  `/api/food-components/${route.params.id}`,
  {
    key: `food-catalog-${route.params.id}`,
  },
);

const isLoading = computed(
  () => status.value === 'idle' || status.value === 'pending',
);

async function onSaved() {
  if (typeof route.query.returnTo === 'string') {
    await navigateTo(route.query.returnTo);
    return;
  }

  await navigateTo('/platillos');
}

function onDirtyChange(value: boolean) {
  hasUnsavedChanges.value = value;
}

async function onBack() {
  if (hasUnsavedChanges.value) {
    leaveConfirmOpen.value = true;
    return;
  }

  await navigateTo(backTo.value);
}

async function leaveWithoutSaving() {
  leaveConfirmOpen.value = false;
  await navigateTo(backTo.value);
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
      <section
        class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div class="space-y-1">
          <h1 class="text-3xl font-semibold tracking-tight text-primary">
            Editar platillo
          </h1>
          <p class="max-w-2xl text-sm text-muted">
            Edita un platillo existente y conserva su información actualizada
            dentro del catálogo.
          </p>
        </div>

        <div class="flex items-center gap-3 lg:justify-end">
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
            :disabled="!hasUnsavedChanges || isLoading"
            :color="hasUnsavedChanges && !isLoading ? 'primary' : 'neutral'"
            :variant="hasUnsavedChanges && !isLoading ? 'solid' : 'subtle'"
            icon="i-lucide-save"
            class="cursor-pointer"
          >
            Guardar cambios
          </UButton>
        </div>
      </section>

      <div class="mx-auto w-full max-w-5xl">
        <AdminFoodCatalogForm
          :form-id="editFormId"
          hide-submit
          :item="item"
          :loading-fields="isLoading"
          :loading-sidebar="isLoading"
          mode="edit"
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
          <p class="text-sm text-muted">¿Quieres regresar de todos modos?</p>
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
    </template>
  </main>
</template>
