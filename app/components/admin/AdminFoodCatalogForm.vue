<script setup lang="ts">
import type { FormError } from '@nuxt/ui';
import type {
  FoodCatalogItem,
  FoodCatalogItemDetail,
  FoodCatalogItemInput,
} from '~~/types/types';
import Skeleton from 'boneyard-js/vue';
import fieldsBones from '~/bones/admin-food-catalog-edit-fields.bones.json';
import sidebarBones from '~/bones/admin-food-catalog-edit-sidebar.bones.json';
import { foodCatalogItemInputSchema } from '~~/types/menuSchema';
import { formatDateTime } from '~/utils/formatters';

const props = withDefaults(
  defineProps<{
    formId?: string;
    hideSubmit?: boolean;
    item?: FoodCatalogItemDetail | null;
    loadingFields?: boolean;
    loadingSidebar?: boolean;
    mode?: 'create' | 'edit';
  }>(),
  {
    formId: undefined,
    hideSubmit: false,
    loadingFields: false,
    loadingSidebar: false,
    mode: 'create',
    item: null,
  },
);

const emit = defineEmits<{
  saved: [];
  'dirty-change': [value: boolean];
}>();

const toast = useToast();
const { saveFoodCatalogItem } = useFoodCatalog();
const { data: catalogItems } = useFetch<FoodCatalogItem[]>(
  '/api/food-components',
  {
    key: 'food-catalog-items-validation',
    default: () => [],
  },
);

type FoodCatalogFormState = Omit<FoodCatalogItemInput, 'tipo'> & {
  tipo?: string;
};

const state = reactive<FoodCatalogFormState>({
  nombre: '',
  descripcion: '',
  calorias: 0,
  imagen: '',
  tipo: undefined,
});

const foodTypeOptions = [
  'Desayuno',
  'Comida',
  'Cena',
  'Guarnición',
  'Snack',
  'Ramekin',
];

const isSubmitting = ref(false);
const errorMessage = ref('');
const initialSnapshot = ref('');
const fieldErrors = reactive<Record<keyof FoodCatalogItemInput, string>>({
  nombre: '',
  descripcion: '',
  calorias: '',
  imagen: '',
  tipo: '',
});

const formErrors = computed<FormError[]>(() =>
  (Object.entries(fieldErrors) as Array<[keyof FoodCatalogItemInput, string]>)
    .filter(([, message]) => Boolean(message))
    .map(([name, message]) => ({ name, message })),
);

function showValidationToast() {
  toast.add({
    title: 'El platillo no se pudo guardar',
    description: 'Los campos marcados en rojo hacen falta por llenar o revisar.',
    color: 'error',
    icon: 'i-lucide-circle-alert',
  });
}

function findDuplicateName(nombre: string) {
  const normalizedName = nombre.trim().toLocaleLowerCase('es-MX');

  return (catalogItems.value ?? []).find(
    (item) =>
      item.id !== props.item?.id &&
      item.nombre.trim().toLocaleLowerCase('es-MX') === normalizedName,
  );
}

function syncState(item?: FoodCatalogItemDetail | null) {
  state.nombre = item?.nombre ?? '';
  state.descripcion = item?.descripcion ?? '';
  state.calorias = item?.calorias ?? 0;
  state.imagen = item?.imagen ?? '';
  state.tipo = item?.tipo ?? undefined;
  initialSnapshot.value = JSON.stringify(state);
}

watch(
  () => props.item,
  (item) => {
    syncState(item);
  },
  { immediate: true },
);

watch(
  () => state.nombre,
  () => {
    if (fieldErrors.nombre) {
      fieldErrors.nombre = '';
    }
  },
);

watch(
  () => state.tipo,
  () => {
    if (fieldErrors.tipo) {
      fieldErrors.tipo = '';
    }
  },
);

const isDirty = computed(() => JSON.stringify(state) !== initialSnapshot.value);

watch(
  () => isDirty.value,
  (value) => {
    emit('dirty-change', value);
  },
  { immediate: true },
);

async function onSubmit() {
  if (isSubmitting.value) {
    return;
  }

  errorMessage.value = '';
  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as keyof FoodCatalogItemInput] = '';
  });

  const payload = {
    nombre: state.nombre.trim(),
    descripcion: state.descripcion.trim(),
    calorias: Number(state.calorias) || 0,
    imagen: state.imagen.trim(),
    tipo: state.tipo?.trim() ?? '',
  };

  const parsed = foodCatalogItemInputSchema.safeParse(payload);

  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      const fieldName = issue.path[0];

      if (typeof fieldName === 'string' && fieldName in fieldErrors) {
        const typedFieldName = fieldName as keyof FoodCatalogItemInput;

        if (!fieldErrors[typedFieldName]) {
          fieldErrors[typedFieldName] = issue.message;
        }
      }
    });

    showValidationToast();
    return;
  }

  const duplicateItem = findDuplicateName(parsed.data.nombre);

  if (duplicateItem) {
    fieldErrors.nombre = 'Ya existe un platillo con ese nombre.';
    showValidationToast();
    return;
  }

  isSubmitting.value = true;

  try {
    await saveFoodCatalogItem(parsed.data, props.item?.id);

    toast.add({
      title: props.mode === 'edit' ? 'Platillo actualizado' : 'Platillo creado',
      description:
        props.mode === 'edit'
          ? 'Los cambios ya quedaron guardados.'
          : 'Ya puedes usar este platillo dentro de tus menús.',
      color: 'success',
      icon: 'i-lucide-check-circle',
    });

    initialSnapshot.value = JSON.stringify(state);
    emit('dirty-change', false);
    emit('saved');
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : 'No se pudo guardar el platillo.';
    toast.add({
      title: 'Error al guardar',
      description: errorMessage.value,
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UForm
    :id="formId"
    :state="state"
    :errors="formErrors"
    class="grid items-start gap-6 lg:grid-cols-[1.2fr_0.8fr]"
    @submit.prevent="onSubmit"
  >
    <UCard class="app-surface self-start" :ui="{ body: 'p-6' }">
      <div class="space-y-1">
        <h2 class="text-xl font-semibold text-highlighted">
          {{
            mode === 'edit'
              ? 'Editar información del platillo'
              : 'Información del nuevo platillo'
          }}
        </h2>
        <p class="text-sm text-muted">
          El catálogo alimenta el editor de menús y también actualiza las
          referencias históricas asociadas.
        </p>
      </div>

      <div class="space-y-5">
        <UAlert
          v-if="errorMessage"
          color="error"
          variant="soft"
          icon="i-lucide-circle-alert"
          title="No se pudo guardar"
          :description="errorMessage"
        />

        <Skeleton
          name="admin-food-catalog-edit-fields"
          :initial-bones="fieldsBones"
          :loading="loadingFields"
        >
          <div class="mt-4 grid gap-5">
          <UFormField name="nombre" :error="false" label="Nombre" class="min-w-0" :ui="{ label: 'font-semibold text-highlighted' }">
            <UInput
              v-model="state.nombre"
              class="w-full"
              :color="fieldErrors.nombre ? 'error' : 'neutral'"
              :ui="{
                base: fieldErrors.nombre
                  ? '!ring !ring-inset !ring-error focus-visible:!ring-error'
                  : 'focus-visible:!ring-2 focus-visible:!ring-inset focus-visible:!ring-primary',
              }"
              size="xl"
              placeholder="Ej. Bowl de pollo con arroz integral"
            />
          </UFormField>

          <UFormField name="tipo" :error="false" label="Tipo" class="min-w-0" :ui="{ label: 'font-semibold text-highlighted' }">
            <USelect
              v-model="state.tipo"
              :items="foodTypeOptions"
              class="w-full"
              :color="fieldErrors.tipo ? 'error' : 'primary'"
              :ui="{
                content: '!max-h-none',
                base: fieldErrors.tipo
                  ? '!ring !ring-inset !ring-error focus-visible:!ring-error'
                  : 'focus-visible:!ring-2 focus-visible:!ring-inset focus-visible:!ring-primary',
                viewport: '!overflow-visible',
              }"
              size="xl"
              placeholder="Selecciona un tipo"
            />
          </UFormField>

          <UFormField name="descripcion" label="Descripción" class="min-w-0" :ui="{ label: 'font-semibold text-highlighted' }">
            <UTextarea
              v-model="state.descripcion"
              class="w-full"
              :rows="5"
              autoresize
              placeholder="Describe rápidamente el platillo, ingredientes o notas internas."
            />
          </UFormField>

          <div class="grid gap-5">
            <UFormField name="calorias" label="Calorías" class="min-w-0" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model.number="state.calorias"
                class="w-full"
                type="number"
                min="0"
                size="xl"
                placeholder="0"
              />
            </UFormField>

            <UFormField name="imagen" label="URL de imagen" class="min-w-0" :ui="{ label: 'font-semibold text-highlighted' }">
              <UInput
                v-model="state.imagen"
                class="w-full"
                type="url"
                size="xl"
                placeholder="https://..."
              />
            </UFormField>
          </div>
          </div>
        </Skeleton>

      </div>

      <div
        v-if="item || !hideSubmit"
        class="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
          <p v-if="item" class="mt-1 text-sm text-muted">
            Última actualización: {{ formatDateTime(item.updatedAt) }}
          </p>

          <UButton
            v-if="!hideSubmit"
            type="submit"
            size="lg"
            icon="i-lucide-save"
            :loading="isSubmitting"
          >
            {{ mode === 'edit' ? 'Guardar cambios' : 'Crear platillo' }}
          </UButton>
      </div>
    </UCard>

    <div class="grid content-start gap-6">
      <Skeleton
        name="admin-food-catalog-edit-sidebar"
        :initial-bones="sidebarBones"
        :loading="loadingSidebar"
      >
        <div class="grid gap-6">
          <UCard class="app-surface-soft" :ui="{ body: 'space-y-5 p-6' }">
            <div
              class="overflow-hidden rounded-none border border-default/70 bg-default"
            >
              <div
                v-if="state.imagen"
                class="aspect-[4/3] overflow-hidden rounded-none"
              >
                <img
                  :src="state.imagen"
                  :alt="state.nombre || 'Vista previa del platillo'"
                  class="h-full w-full object-cover"
                />
              </div>
              <div
                v-else
                class="flex aspect-[4/3] items-center justify-center rounded-none bg-[radial-gradient(circle_at_top,#00dc8220,transparent_55%)] text-muted"
              >
                <div class="text-center">
                  <UIcon name="i-lucide-image" class="mx-auto mb-2 size-8" />
                  <p class="text-sm">Agrega una imagen para verla aquí</p>
                </div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <UBadge color="primary" variant="subtle">
                  {{ state.tipo || 'Sin tipo' }}
                </UBadge>
                <UBadge color="neutral" variant="soft">
                  {{ state.calorias || 0 }} kcal
                </UBadge>
              </div>

              <h3 class="text-lg font-semibold text-highlighted">
                {{ state.nombre || 'Nombre pendiente' }}
              </h3>
              <p class="text-sm text-toned">
                {{
                  state.descripcion ||
                  'Aquí verás un resumen rápido del platillo mientras lo capturas.'
                }}
              </p>
            </div>
          </UCard>

          <UCard class="app-surface-soft" :ui="{ body: 'p-6' }">
            <div class="space-y-4">
              <div class="flex items-center gap-2">
                <UIcon
                  name="i-lucide-notebook-tabs"
                  class="size-4 text-primary"
                />
                <h4 class="text-sm font-semibold text-highlighted">
                  Menús vinculados
                </h4>
              </div>

              <div v-if="item?.linkedMenus?.length" class="space-y-2">
                <p
                  v-if="item.linkedMenus.length === 1"
                  class="text-sm text-muted"
                >
                  Este platillo aparece actualmente en el siguiente menú:
                </p>

                <UAlert
                  v-else
                  color="warning"
                  variant="subtle"
                  icon="i-lucide-triangle-alert"
                  title="Este platillo aparece en más de un menú"
                  description="Revisa los menús vinculados porque este platillo ya se está usando."
                />

                <ul class="space-y-2">
                  <li v-for="menu in item.linkedMenus" :key="menu.id">
                    <UButton
                      :to="`/menu/${menu.id}`"
                      color="primary"
                      variant="subtle"
                      block
                      class="justify-start"
                      :ui="{
                        base: 'justify-start px-3 py-2 text-sm font-normal',
                      }"
                      trailing-icon="i-lucide-arrow-up-right"
                    >
                      {{ menu.name }}
                    </UButton>
                  </li>
                </ul>
              </div>

              <p v-else class="text-sm text-muted">
                {{
                  mode === 'edit'
                    ? 'Este platillo todavía no aparece en ningún menú.'
                    : 'Cuando guardes el platillo y lo uses en un menú, aparecerá aquí.'
                }}
              </p>
            </div>
          </UCard>
        </div>
      </Skeleton>
    </div>
  </UForm>
</template>
