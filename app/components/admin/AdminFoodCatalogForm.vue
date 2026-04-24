<script setup lang="ts">
import type { FormError } from '@nuxt/ui';
import type {
  FoodCatalogItem,
  FoodCatalogItemDetail,
  FoodCatalogItemInput,
  MeasurementUnit,
  RecipeStatus,
  SupplyCategorySummary,
  SupplyItemSummary,
} from '~~/types/types';
import { foodCatalogItemInputSchema } from '~~/types/menuSchema';
import { formatDateTime } from '~/utils/formatters';
import { MEASUREMENT_UNIT_VALUES, RECIPE_STATUS_VALUES } from '~~/types/types';

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
  'validity-change': [value: boolean];
  'submit-state-change': [value: boolean];
}>();

type RecipeIngredientFormState = {
  supplyName: string;
  supplyDescription: string;
  supplyCode: string;
  supplyUnitBase: MeasurementUnit;
  supplyCategoryName: string;
  supplyTags: string[];
  supplyCostoReferencial: number | null;
  supplyMermaPorcentaje: number | null;
  supplyCalorias: number | null;
  supplyProteina: number | null;
  supplyCarbohidratos: number | null;
  supplyGrasas: number | null;
  supplyFibra: number | null;
  supplyAzucar: number | null;
  supplySodio: number | null;
  supplyNutritionBasis:
    | 'POR_100_GRAMOS'
    | 'POR_100_MILILITROS'
    | 'POR_PORCION'
    | 'POR_UNIDAD'
    | null;
  supplyDefaultServingSize: number | null;
  supplyDefaultServingUnit: MeasurementUnit | null;
  supplyDensidad: number | null;
  grupo: string;
  cantidad: number | null;
  unidad: MeasurementUnit;
  notas: string;
  opcional: boolean;
};

type NutritionBasisOption =
  | 'POR_100_GRAMOS'
  | 'POR_100_MILILITROS'
  | 'POR_PORCION'
  | 'POR_UNIDAD';

type IngredientNutritionReviewSource = 'USDA' | 'FATSECRET';

type IngredientNutritionReviewState = {
  available: boolean;
  message: string;
  matchedName: string;
  source: string;
  confidence: number | null;
  supplyCalorias: number | null;
  supplyProteina: number | null;
  supplyCarbohidratos: number | null;
  supplyGrasas: number | null;
  supplyFibra: number | null;
  supplyAzucar: number | null;
  supplySodio: number | null;
  supplyNutritionBasis: NutritionBasisOption | null;
  supplyDefaultServingSize: number | null;
  supplyDefaultServingUnit: MeasurementUnit | null;
  supplyDensidad: number | null;
};

type IngredientNutritionLookupResponse = {
  normalized?: {
    name?: string | null;
    matchedName?: string | null;
    nutritionBasis?: NutritionBasisOption | null;
    defaultServingSize?: number | null;
    defaultServingUnit?: MeasurementUnit | null;
    density?: number | null;
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    fiber?: number | null;
    sugar?: number | null;
    sodium?: number | null;
  } | null;
  source?: string | null;
  confidence?: number | null;
  providerMatches?: Array<{
    source: IngredientNutritionReviewSource;
    matched: boolean;
    needsReview: boolean;
    confidence: number | null;
    message: string;
    normalized?: IngredientNutritionLookupResponse['normalized'];
  }>;
};
type IngredientNutritionProviderMatch = NonNullable<
  IngredientNutritionLookupResponse['providerMatches']
>[number];

type RecipeFormState = {
  status: RecipeStatus;
  porciones: number | null;
  rendimientoCantidad: number | null;
  rendimientoUnidad: MeasurementUnit | undefined;
  tiempoPreparacionMin: number | null;
  tiempoCoccionMin: number | null;
  instrucciones: string;
  notas: string;
  ingredients: RecipeIngredientFormState[];
};

type FoodCatalogFormState = Omit<FoodCatalogItemInput, 'tipo' | 'recipe'> & {
  tipo?: string;
  recipe: RecipeFormState;
};

type FieldErrorKey = keyof Omit<FoodCatalogItemInput, 'recipe'> | 'recipe';
const toast = useToast();
const { saveFoodCatalogItem } = useFoodCatalog();
const { saveSupplyCategory } = useSupplyCategories();
const { data: catalogItems } = useFetch<FoodCatalogItem[]>(
  '/api/food-components',
  {
    key: 'food-catalog-items-validation',
    default: () => [],
  },
);
const { data: supplyItems } = useFetch<SupplyItemSummary[]>('/api/supplies', {
  key: 'supply-items-catalog',
  default: () => [],
});
const { data: supplyCategories, refresh: refreshSupplyCategories } = useFetch<
  SupplyCategorySummary[]
>('/api/supply-categories', {
  key: 'supply-categories-catalog',
  default: () => [],
});
const { data: recipeIngredientGroups } = useFetch<string[]>(
  '/api/recipe-ingredient-groups',
  {
    key: 'recipe-ingredient-groups-catalog',
    default: () => [],
  },
);

const foodTypeOptions = [
  'Desayuno',
  'Comida',
  'Cena',
  'Guarnición',
  'Snack',
  'Ramekin',
];

const recipeStatusOptions = [...RECIPE_STATUS_VALUES];
const unitOptions = MEASUREMENT_UNIT_VALUES.map((unit) => ({
  label: unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase(),
  value: unit,
}));
const state = reactive<FoodCatalogFormState>({
  nombre: '',
  descripcion: '',
  calorias: 0,
  imagen: '',
  tipo: undefined,
  recipe: createEmptyRecipe(),
});

const isSubmitting = ref(false);
const ingredientModalOpen = ref(false);
const editingIngredientIndex = ref<number | null>(null);
const recipeDocumentModalOpen = ref(false);
const zeroCaloriesModalOpen = ref(false);
const pendingSavePayload = ref<FoodCatalogItemInput | null>(null);
const isCreatingSupplyCategory = ref(false);
const isHydratingIngredientNutrition = ref(false);
const ingredientNutritionReviewOpen = ref(false);
const createdSupplyItemOptions = ref<string[]>([]);
const createdIngredientGroupOptions = ref<string[]>([]);
const pendingIngredientModalCloseAction = ref<null | (() => void)>(null);
const ingredientDeleteConfirmOpen = ref(false);
const pendingIngredientDeleteIndex = ref<number | null>(null);
const activeRecipeDocumentField = ref<'instrucciones' | 'notas'>(
  'instrucciones',
);
const activeIngredientMacroTab = ref<'actual' | 'base'>('actual');
const errorMessage = ref('');
const recipeIssues = ref<string[]>([]);
const initialSnapshot = ref('');
const fieldErrors = reactive<Record<FieldErrorKey, string>>({
  nombre: '',
  descripcion: '',
  calorias: '',
  imagen: '',
  tipo: '',
  recipe: '',
});
const ingredientFieldErrors = reactive({
  supplyName: '',
  cantidad: '',
  supplyCategoryName: '',
});

const formErrors = computed<FormError[]>(() =>
  (Object.entries(fieldErrors) as Array<[FieldErrorKey, string]>)
    .filter(([, message]) => Boolean(message))
    .map(([name, message]) => ({ name, message })),
);
const isFormHydrating = computed(
  () => props.mode === 'edit' && props.loadingFields,
);

const ingredientCount = computed(() => state.recipe.ingredients.length);
const activeIngredientGroupTab = ref('todos');
const activeIngredientNutritionReviewTab =
  ref<IngredientNutritionReviewSource>('USDA');
const ingredientPreview = computed(() =>
  state.recipe.ingredients
    .map((ingredient) => ingredient.supplyName.trim())
    .filter(Boolean)
    .slice(0, 4),
);
const ingredientDraft = reactive<RecipeIngredientFormState>(
  createEmptyIngredient(),
);
const ingredientNutritionReviewDrafts = reactive<
  Record<IngredientNutritionReviewSource, IngredientNutritionReviewState>
>({
  USDA: createEmptyIngredientNutritionReview('USDA'),
  FATSECRET: createEmptyIngredientNutritionReview('FATSECRET'),
});
const isCreatingIngredient = computed(
  () => editingIngredientIndex.value === null,
);
const activeIngredientNutritionReviewDraft = computed(
  () => ingredientNutritionReviewDrafts[activeIngredientNutritionReviewTab.value],
);
const activeIngredientNutritionConfidence = computed(() =>
  activeIngredientNutritionReviewDraft.value.confidence === null
    ? ''
    : String(activeIngredientNutritionReviewDraft.value.confidence),
);
const activeIngredientNutritionBasis = computed({
  get: () =>
    activeIngredientNutritionReviewDraft.value.supplyNutritionBasis ?? undefined,
  set: (value: NutritionBasisOption | undefined) => {
    activeIngredientNutritionReviewDraft.value.supplyNutritionBasis =
      value ?? null;
  },
});
const activeIngredientServingUnit = computed({
  get: () =>
    activeIngredientNutritionReviewDraft.value.supplyDefaultServingUnit ??
    undefined,
  set: (value: MeasurementUnit | undefined) => {
    activeIngredientNutritionReviewDraft.value.supplyDefaultServingUnit =
      value ?? null;
  },
});
function formatSelectMenuLabel(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) return '';

  return (
    trimmedValue.charAt(0).toUpperCase() + trimmedValue.slice(1).toLowerCase()
  );
}
const supplyItemOptions = computed(() =>
  Array.from(
    new Set([
      ...(supplyItems.value ?? []).map((supply) => supply.nombre),
      ...createdSupplyItemOptions.value,
    ]),
  ).map((supplyName) => ({
    label: formatSelectMenuLabel(supplyName),
    value: supplyName,
  })),
);
const supplyCategoryOptions = computed(() =>
  (supplyCategories.value ?? []).map((category) => ({
    label: formatSelectMenuLabel(category.nombre),
    value: category.nombre,
  })),
);
const supplyTagOptions = computed(() =>
  Array.from(
    new Set([
      ...(supplyItems.value ?? []).flatMap((supply) => normalizeTags(supply.tags)),
      ...state.recipe.ingredients.flatMap((ingredient) =>
        normalizeTags(ingredient.supplyTags),
      ),
      ...normalizeTags(ingredientDraft.supplyTags),
    ]),
  ).map((tag) => ({
    label: formatSelectMenuLabel(tag),
    value: tag,
  })),
);
const ingredientGroupOptions = computed(() =>
  Array.from(
    new Set(
      [
        ...(recipeIngredientGroups.value ?? []),
        ...state.recipe.ingredients.map((ingredient) => ingredient.grupo.trim()),
        ...createdIngredientGroupOptions.value,
      ].filter(Boolean),
    ),
  ).map((group) => ({
    label: formatSelectMenuLabel(group),
    value: group,
  })),
);
const selectedIngredientSupply = computed(() => {
  const normalizedName = ingredientDraft.supplyName
    .trim()
    .toLocaleLowerCase('es-MX');

  if (!normalizedName) {
    return null;
  }

  return (
    (supplyItems.value ?? []).find(
      (item) =>
        item.nombre.trim().toLocaleLowerCase('es-MX') === normalizedName,
    ) ?? null
  );
});
const ingredientNutritionFactor = computed(() =>
  resolveIngredientNutritionFactor(ingredientDraft),
);
const computedIngredientMacros = computed(() => {
  const factor = ingredientNutritionFactor.value;

  const scale = (value: number | null) =>
    factor === null || value === null ? null : roundNutritionValue(value * factor);

  return {
    calories: scale(ingredientDraft.supplyCalorias),
    protein: scale(ingredientDraft.supplyProteina),
    carbs: scale(ingredientDraft.supplyCarbohidratos),
    fat: scale(ingredientDraft.supplyGrasas),
    fiber: scale(ingredientDraft.supplyFibra),
    sugar: scale(ingredientDraft.supplyAzucar),
    sodium: scale(ingredientDraft.supplySodio),
  };
});
const ingredientListTabs = computed(() => [
  {
    label: 'Todos',
    value: 'todos',
  },
  ...Array.from(
    new Set(
      state.recipe.ingredients
        .map((ingredient) => ingredient.grupo.trim())
        .filter(Boolean),
    ),
  ).map((group) => ({
    label: formatSelectMenuLabel(group),
    value: group,
  })),
]);
const nutritionBasisOptions = [
  { label: 'Por 100 gramos', value: 'POR_100_GRAMOS' },
  { label: 'Por 100 mililitros', value: 'POR_100_MILILITROS' },
  { label: 'Por porción', value: 'POR_PORCION' },
  { label: 'Por unidad', value: 'POR_UNIDAD' },
];
const ingredientMacroTabs = [
  { label: 'En esta receta', value: 'actual' },
  { label: 'Base', value: 'base' },
];
const ingredientNutritionReviewTabs = [
  { label: 'USDA', value: 'USDA' },
  { label: 'FatSecret', value: 'FATSECRET' },
];
const filteredIngredients = computed(() => {
  const ingredientsWithIndex = state.recipe.ingredients.map((ingredient, index) => ({
    ingredient,
    index,
  }));

  if (activeIngredientGroupTab.value === 'todos') {
    return [...ingredientsWithIndex].sort((a, b) => {
      const groupA = a.ingredient.grupo.trim().toLocaleLowerCase('es-MX');
      const groupB = b.ingredient.grupo.trim().toLocaleLowerCase('es-MX');

      if (groupA === groupB) {
        return a.index - b.index;
      }

      if (!groupA) return 1;
      if (!groupB) return -1;

      return groupA.localeCompare(groupB, 'es-MX');
    });
  }

  return ingredientsWithIndex
    .filter(
      ({ ingredient }) =>
        ingredient.grupo.trim() === activeIngredientGroupTab.value,
    );
});
const recipeDocumentConfig = computed(() => {
  const isInstructions = activeRecipeDocumentField.value === 'instrucciones';

  return {
    label: isInstructions ? 'Instrucciones' : 'Notas operativas',
    title: isInstructions ? 'Editar instrucciones' : 'Editar notas operativas',
    description: isInstructions
      ? 'Captura los pasos del proceso en un formato más cómodo para lectura y edición.'
      : 'Documenta notas internas, empaque, conservación o cualquier detalle operativo.',
    placeholder: isInstructions
      ? 'Detalla pasos, orden de producción y puntos críticos.'
      : 'Notas internas, empaque, reposo, conservación o montaje.',
  };
});
const recipeCaloriesTotal = computed(() =>
  Math.round(
    state.recipe.ingredients.reduce((sum, ingredient) => {
      const value = resolveIngredientMacroValue(
        ingredient,
        ingredient.supplyCalorias,
      );

      return sum + (value ?? 0);
    }, 0),
  ),
);
const activeRecipeDocumentValue = computed({
  get: () =>
    activeRecipeDocumentField.value === 'instrucciones'
      ? state.recipe.instrucciones
      : state.recipe.notas,
  set: (value: string) => {
    if (activeRecipeDocumentField.value === 'instrucciones') {
      state.recipe.instrucciones = value;
      return;
    }

    state.recipe.notas = value;
  },
});

function createEmptyIngredient(): RecipeIngredientFormState {
  return {
    supplyName: '',
    supplyDescription: '',
    supplyCode: '',
    supplyUnitBase: 'GRAMO',
    supplyCategoryName: '',
    supplyTags: [],
    supplyCostoReferencial: null,
    supplyMermaPorcentaje: null,
    supplyCalorias: null,
    supplyProteina: null,
    supplyCarbohidratos: null,
    supplyGrasas: null,
    supplyFibra: null,
    supplyAzucar: null,
    supplySodio: null,
    supplyNutritionBasis: null,
    supplyDefaultServingSize: null,
    supplyDefaultServingUnit: null,
    supplyDensidad: null,
    grupo: 'General',
    cantidad: null,
    unidad: 'GRAMO',
    notas: '',
    opcional: false,
  };
}

function createEmptyRecipe(): RecipeFormState {
  return {
    status: 'BORRADOR',
    porciones: null,
    rendimientoCantidad: null,
    rendimientoUnidad: undefined,
    tiempoPreparacionMin: null,
    tiempoCoccionMin: null,
    instrucciones: '',
    notas: '',
    ingredients: [],
  };
}

function createEmptyIngredientNutritionReview(
  source: IngredientNutritionReviewSource,
): IngredientNutritionReviewState {
  return {
    available: false,
    message: `No hubo coincidencias útiles en ${source}.`,
    matchedName: '',
    source,
    confidence: null,
    supplyCalorias: null,
    supplyProteina: null,
    supplyCarbohidratos: null,
    supplyGrasas: null,
    supplyFibra: null,
    supplyAzucar: null,
    supplySodio: null,
    supplyNutritionBasis: null,
    supplyDefaultServingSize: null,
    supplyDefaultServingUnit: null,
    supplyDensidad: null,
  };
}

function syncIngredientNutritionReview(
  reviewSource: IngredientNutritionReviewSource,
  source?: Partial<IngredientNutritionReviewState> | null,
) {
  const target = ingredientNutritionReviewDrafts[reviewSource];
  const nextValue = source ?? createEmptyIngredientNutritionReview(reviewSource);

  target.available = nextValue.available ?? false;
  target.message =
    nextValue.message ??
    `No hubo coincidencias útiles en ${reviewSource}.`;
  target.matchedName = nextValue.matchedName ?? '';
  target.source = nextValue.source ?? reviewSource;
  target.confidence = nextValue.confidence ?? null;
  target.supplyCalorias = nextValue.supplyCalorias ?? null;
  target.supplyProteina = nextValue.supplyProteina ?? null;
  target.supplyCarbohidratos = nextValue.supplyCarbohidratos ?? null;
  target.supplyGrasas = nextValue.supplyGrasas ?? null;
  target.supplyFibra = nextValue.supplyFibra ?? null;
  target.supplyAzucar = nextValue.supplyAzucar ?? null;
  target.supplySodio = nextValue.supplySodio ?? null;
  target.supplyNutritionBasis = nextValue.supplyNutritionBasis ?? null;
  target.supplyDefaultServingSize =
    nextValue.supplyDefaultServingSize ?? null;
  target.supplyDefaultServingUnit =
    nextValue.supplyDefaultServingUnit ?? null;
  target.supplyDensidad = nextValue.supplyDensidad ?? null;
}

function resetIngredientNutritionReview() {
  syncIngredientNutritionReview('USDA');
  syncIngredientNutritionReview('FATSECRET');
  activeIngredientNutritionReviewTab.value = 'USDA';
}

function syncIngredientDraft(source?: RecipeIngredientFormState | null) {
  const nextValue = source ?? createEmptyIngredient();

  ingredientDraft.supplyName = nextValue.supplyName;
  ingredientDraft.supplyDescription = nextValue.supplyDescription;
  ingredientDraft.supplyCode = nextValue.supplyCode;
  ingredientDraft.supplyUnitBase = nextValue.supplyUnitBase;
  ingredientDraft.supplyCategoryName = nextValue.supplyCategoryName;
  ingredientDraft.supplyTags = [...nextValue.supplyTags];
  ingredientDraft.supplyCostoReferencial = nextValue.supplyCostoReferencial;
  ingredientDraft.supplyMermaPorcentaje = nextValue.supplyMermaPorcentaje;
  ingredientDraft.supplyCalorias = nextValue.supplyCalorias;
  ingredientDraft.supplyProteina = nextValue.supplyProteina;
  ingredientDraft.supplyCarbohidratos = nextValue.supplyCarbohidratos;
  ingredientDraft.supplyGrasas = nextValue.supplyGrasas;
  ingredientDraft.supplyFibra = nextValue.supplyFibra;
  ingredientDraft.supplyAzucar = nextValue.supplyAzucar;
  ingredientDraft.supplySodio = nextValue.supplySodio;
  ingredientDraft.supplyNutritionBasis = nextValue.supplyNutritionBasis;
  ingredientDraft.supplyDefaultServingSize = nextValue.supplyDefaultServingSize;
  ingredientDraft.supplyDefaultServingUnit = nextValue.supplyDefaultServingUnit;
  ingredientDraft.supplyDensidad = nextValue.supplyDensidad;
  ingredientDraft.grupo = nextValue.grupo;
  ingredientDraft.cantidad = nextValue.cantidad;
  ingredientDraft.unidad = nextValue.unidad;
  ingredientDraft.notas = nextValue.notas;
  ingredientDraft.opcional = nextValue.opcional;
}

function buildIngredientNutritionReviewFromLookup(
  source: IngredientNutritionReviewSource,
  match?: IngredientNutritionProviderMatch | null,
) {
  if (!match?.normalized) {
    return {
      available: false,
      message: match?.message ?? `No hubo coincidencias útiles en ${source}.`,
      matchedName: '',
      source,
      confidence: match?.confidence ?? null,
      supplyCalorias: null,
      supplyProteina: null,
      supplyCarbohidratos: null,
      supplyGrasas: null,
      supplyFibra: null,
      supplyAzucar: null,
      supplySodio: null,
      supplyNutritionBasis: null,
      supplyDefaultServingSize: null,
      supplyDefaultServingUnit: null,
      supplyDensidad: null,
    } satisfies IngredientNutritionReviewState;
  }

  return {
    available: true,
    message: match.message,
    matchedName: match.normalized.matchedName ?? match.normalized.name ?? '',
    source,
    confidence: match.confidence ?? null,
    supplyCalorias: match.normalized.calories ?? null,
    supplyProteina: match.normalized.protein ?? null,
    supplyCarbohidratos: match.normalized.carbs ?? null,
    supplyGrasas: match.normalized.fat ?? null,
    supplyFibra: match.normalized.fiber ?? null,
    supplyAzucar: match.normalized.sugar ?? null,
    supplySodio: match.normalized.sodium ?? null,
    supplyNutritionBasis: match.normalized.nutritionBasis ?? null,
    supplyDefaultServingSize: match.normalized.defaultServingSize ?? null,
    supplyDefaultServingUnit: match.normalized.defaultServingUnit ?? null,
    supplyDensidad: match.normalized.density ?? null,
  } satisfies IngredientNutritionReviewState;
}

function formatEnumLabel(value: string) {
  return value
    .toLocaleLowerCase('es-MX')
    .split('_')
    .map((part) => part.charAt(0).toLocaleUpperCase('es-MX') + part.slice(1))
    .join(' ');
}

function formatRecipeUnitLabel(unit: MeasurementUnit, quantity: number | null) {
  const baseLabel = formatEnumLabel(unit);

  if (quantity === null || quantity === 1) {
    return baseLabel;
  }

  return `${baseLabel}(s)`;
}

function formatIngredientNutritionBasisDisplay(
  ingredient: RecipeIngredientFormState,
) {
  const basis =
    ingredient.supplyNutritionBasis
    ?? resolveNutritionBasisFromSupplyUnit(ingredient.supplyUnitBase);
  const servingSize =
    ingredient.supplyDefaultServingSize
    ?? resolveNutritionServingSizeFromSupplyUnit(ingredient.supplyUnitBase);
  const servingUnit =
    ingredient.supplyDefaultServingUnit
    ?? resolveNutritionServingUnitFromSupplyUnit(ingredient.supplyUnitBase);

  if (!basis || !servingUnit) {
    return 'Sin base nutricional disponible';
  }

  if (basis === 'POR_UNIDAD') {
    return `${servingSize ?? 1} ${formatEnumLabel(servingUnit)}`;
  }

  return `${servingSize ?? 100} ${formatEnumLabel(servingUnit)}`;
}

function roundNutritionValue(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return null;
  }

  return Math.round(value * 100) / 100;
}

function convertToGrams(quantity: number | null, unit: MeasurementUnit | null) {
  if (quantity === null || !unit) {
    return null;
  }

  const ratios: Partial<Record<MeasurementUnit, number>> = {
    GRAMO: 1,
    KILOGRAMO: 1000,
    ONZA: 28.349523125,
    LIBRA: 453.59237,
  };

  const ratio = ratios[unit];
  return ratio ? quantity * ratio : null;
}

function convertToMilliliters(
  quantity: number | null,
  unit: MeasurementUnit | null,
) {
  if (quantity === null || !unit) {
    return null;
  }

  const ratios: Partial<Record<MeasurementUnit, number>> = {
    MILILITRO: 1,
    LITRO: 1000,
    TAZA: 240,
    CUCHARADA: 15,
    CUCHARADITA: 5,
    BOTELLA: 1000,
    LATA: 355,
  };

  const ratio = ratios[unit];
  return ratio ? quantity * ratio : null;
}

function isMassMeasurementUnit(unit: MeasurementUnit) {
  return ['GRAMO', 'KILOGRAMO', 'ONZA', 'LIBRA'].includes(unit);
}

function isVolumeMeasurementUnit(unit: MeasurementUnit) {
  return [
    'MILILITRO',
    'LITRO',
    'TAZA',
    'CUCHARADA',
    'CUCHARADITA',
    'BOTELLA',
    'LATA',
  ].includes(unit);
}

function resolveNutritionBasisFromSupplyUnit(
  unit: MeasurementUnit,
): NutritionBasisOption {
  if (isMassMeasurementUnit(unit)) {
    return 'POR_100_GRAMOS';
  }

  if (isVolumeMeasurementUnit(unit)) {
    return 'POR_100_MILILITROS';
  }

  return 'POR_UNIDAD';
}

function resolveNutritionServingUnitFromSupplyUnit(
  unit: MeasurementUnit,
): MeasurementUnit {
  if (isMassMeasurementUnit(unit)) {
    return 'GRAMO';
  }

  if (isVolumeMeasurementUnit(unit)) {
    return 'MILILITRO';
  }

  return 'PIEZA';
}

function resolveNutritionServingSizeFromSupplyUnit(unit: MeasurementUnit) {
  if (isMassMeasurementUnit(unit) || isVolumeMeasurementUnit(unit)) {
    return 100;
  }

  return 1;
}

function syncIngredientNutritionBaseFromSupplyUnit(unit: MeasurementUnit) {
  ingredientDraft.supplyNutritionBasis =
    resolveNutritionBasisFromSupplyUnit(unit);
  ingredientDraft.supplyDefaultServingUnit =
    resolveNutritionServingUnitFromSupplyUnit(unit);
  ingredientDraft.supplyDefaultServingSize =
    resolveNutritionServingSizeFromSupplyUnit(unit);
}

function resolveIngredientNutritionFactor(ingredient: RecipeIngredientFormState) {
  const basis =
    ingredient.supplyNutritionBasis
    ?? resolveNutritionBasisFromSupplyUnit(ingredient.supplyUnitBase);
  const quantity = ingredient.cantidad;

  if (quantity === null || !basis) {
    return null;
  }

  if (basis === 'POR_100_GRAMOS') {
    const grams = convertToGrams(quantity, ingredient.unidad);

    if (grams !== null) {
      return grams / 100;
    }

    if (ingredient.supplyUnitBase === 'MILILITRO' || ingredient.supplyUnitBase === 'LITRO') {
      const milliliters = convertToMilliliters(quantity, ingredient.unidad);
      const density = ingredient.supplyDensidad;

      if (milliliters !== null && density !== null) {
        return (milliliters * density) / 100;
      }
    }

    return null;
  }

  if (basis === 'POR_100_MILILITROS') {
    const milliliters = convertToMilliliters(quantity, ingredient.unidad);

    if (milliliters !== null) {
      return milliliters / 100;
    }

    return null;
  }

  if (basis === 'POR_UNIDAD') {
    return quantity;
  }

  const servingSize =
    ingredient.supplyDefaultServingSize
    ?? resolveNutritionServingSizeFromSupplyUnit(ingredient.supplyUnitBase);
  const servingUnit =
    ingredient.supplyDefaultServingUnit
    ?? resolveNutritionServingUnitFromSupplyUnit(ingredient.supplyUnitBase);

  if (!servingSize || !servingUnit) {
    return null;
  }

  if (servingUnit === ingredient.unidad) {
    return quantity / servingSize;
  }

  const grams = convertToGrams(quantity, ingredient.unidad);
  const servingGrams = convertToGrams(servingSize, servingUnit);

  if (grams !== null && servingGrams !== null) {
    return grams / servingGrams;
  }

  const milliliters = convertToMilliliters(quantity, ingredient.unidad);
  const servingMilliliters = convertToMilliliters(servingSize, servingUnit);

  if (milliliters !== null && servingMilliliters !== null) {
    return milliliters / servingMilliliters;
  }

  return null;
}

function resolveIngredientMacroValue(
  ingredient: RecipeIngredientFormState,
  value: number | null,
) {
  const factor = resolveIngredientNutritionFactor(ingredient);

  if (factor === null || value === null) {
    return null;
  }

  return roundNutritionValue(value * factor);
}

function normalizeTags(tags: string[]) {
  return Array.from(
    new Set(tags.map((tag) => tag.trim()).filter(Boolean)),
  );
}

function toNullableNumber(value: number | string | null | undefined) {
  if (
    value === '' ||
    value === null ||
    value === undefined ||
    Number.isNaN(Number(value))
  ) {
    return null;
  }

  return Number(value);
}

function ingredientHasContent(ingredient: RecipeIngredientFormState) {
  return Boolean(
    ingredient.supplyName.trim() ||
    ingredient.supplyDescription.trim() ||
    ingredient.supplyCode.trim() ||
    ingredient.supplyCategoryName.trim() ||
    ingredient.supplyTags.length ||
    ingredient.grupo.trim() ||
    ingredient.notas.trim() ||
    ingredient.supplyCostoReferencial !== null ||
    ingredient.supplyMermaPorcentaje !== null ||
    ingredient.supplyCalorias !== null ||
    ingredient.supplyProteina !== null ||
    ingredient.supplyCarbohidratos !== null ||
    ingredient.supplyGrasas !== null ||
    ingredient.supplyFibra !== null ||
    ingredient.supplyAzucar !== null ||
    ingredient.supplySodio !== null ||
    ingredient.supplyNutritionBasis !== null ||
    ingredient.supplyDefaultServingSize !== null ||
    ingredient.supplyDefaultServingUnit !== null ||
    ingredient.supplyDensidad !== null ||
    ingredient.cantidad !== null,
  );
}

function recipeHasContent(recipe: RecipeFormState) {
  return Boolean(
    recipe.ingredients.some(ingredientHasContent) ||
    recipe.instrucciones.trim() ||
    recipe.notas.trim() ||
    recipe.porciones !== null ||
    recipe.rendimientoCantidad !== null ||
    recipe.rendimientoUnidad ||
    recipe.tiempoPreparacionMin !== null ||
    recipe.tiempoCoccionMin !== null,
  );
}

function showValidationToast() {
  toast.add({
    title: 'El platillo no se pudo guardar',
    description:
      'Revisa los campos marcados y los datos de la receta antes de intentar de nuevo.',
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
  state.recipe = item?.recipe
    ? {
        status: item.recipe.status,
        porciones: item.recipe.porciones,
        rendimientoCantidad: item.recipe.rendimientoCantidad,
        rendimientoUnidad: item.recipe.rendimientoUnidad ?? undefined,
        tiempoPreparacionMin: item.recipe.tiempoPreparacionMin,
        tiempoCoccionMin: item.recipe.tiempoCoccionMin,
        instrucciones: item.recipe.instrucciones,
        notas: item.recipe.notas,
        ingredients: item.recipe.ingredients.map((ingredient) => ({
          supplyName: ingredient.supplyItem.nombre,
          supplyDescription: ingredient.supplyItem.descripcion,
          supplyCode: ingredient.supplyItem.codigo ?? '',
          supplyUnitBase: ingredient.supplyItem.unidadBase,
          supplyCategoryName: ingredient.supplyItem.category?.nombre ?? '',
          supplyTags: normalizeTags(ingredient.supplyItem.tags),
          supplyCostoReferencial: ingredient.supplyItem.costoReferencial,
          supplyMermaPorcentaje: ingredient.supplyItem.mermaPorcentaje,
          supplyCalorias: ingredient.supplyItem.calorias ?? null,
          supplyProteina: ingredient.supplyItem.proteina ?? null,
          supplyCarbohidratos: ingredient.supplyItem.carbohidratos ?? null,
          supplyGrasas: ingredient.supplyItem.grasas ?? null,
          supplyFibra: ingredient.supplyItem.fibra ?? null,
          supplyAzucar: ingredient.supplyItem.azucar ?? null,
          supplySodio: ingredient.supplyItem.sodio ?? null,
          supplyNutritionBasis: ingredient.supplyItem.nutritionBasis ?? null,
          supplyDefaultServingSize: ingredient.supplyItem.defaultServingSize ?? null,
          supplyDefaultServingUnit:
            ingredient.supplyItem.defaultServingUnit ?? null,
          supplyDensidad: ingredient.supplyItem.densidad ?? null,
          grupo: ingredient.grupo ?? '',
          cantidad: ingredient.cantidad,
          unidad: ingredient.unidad,
          notas: ingredient.notas,
          opcional: ingredient.opcional,
        })),
      }
    : createEmptyRecipe();

  initialSnapshot.value = JSON.stringify(state);
}

function resetValidationState() {
  errorMessage.value = '';
  recipeIssues.value = [];
  Object.keys(fieldErrors).forEach((key) => {
    fieldErrors[key as FieldErrorKey] = '';
  });
}

function resetIngredientValidationState() {
  ingredientFieldErrors.supplyName = '';
  ingredientFieldErrors.cantidad = '';
  ingredientFieldErrors.supplyCategoryName = '';
}

function openCreateIngredientModal() {
  editingIngredientIndex.value = null;
  syncIngredientDraft();
  resetIngredientValidationState();
  ingredientModalOpen.value = true;
}

function removeIngredient(index: number) {
  state.recipe.ingredients.splice(index, 1);
}

function confirmRemoveEditingIngredient() {
  if (editingIngredientIndex.value === null) {
    return;
  }

  pendingIngredientDeleteIndex.value = editingIngredientIndex.value;
  ingredientDeleteConfirmOpen.value = true;
}

function removeEditingIngredient() {
  if (pendingIngredientDeleteIndex.value === null) {
    ingredientDeleteConfirmOpen.value = false;
    return;
  }

  const ingredientIndex = pendingIngredientDeleteIndex.value;
  ingredientDeleteConfirmOpen.value = false;

  ingredientModalOpen.value = false;
  pendingIngredientModalCloseAction.value = () => {
    removeIngredient(ingredientIndex);
    pendingIngredientDeleteIndex.value = null;
    editingIngredientIndex.value = null;
    syncIngredientDraft();
    resetIngredientValidationState();
  };
}

function cancelRemoveEditingIngredient() {
  ingredientDeleteConfirmOpen.value = false;
  pendingIngredientDeleteIndex.value = null;
}

function openEditIngredientModal(index: number) {
  const ingredient = state.recipe.ingredients[index];
  if (!ingredient) {
    return;
  }

  editingIngredientIndex.value = index;
  syncIngredientDraft(ingredient);
  resetIngredientValidationState();
  ingredientModalOpen.value = true;
}

function closeIngredientModal() {
  ingredientModalOpen.value = false;
  pendingIngredientModalCloseAction.value = () => {
    editingIngredientIndex.value = null;
    syncIngredientDraft();
    resetIngredientValidationState();
  };
}

function hydrateIngredientFromCatalog(ingredient: RecipeIngredientFormState) {
  if (!ingredient) {
    return;
  }

  const normalizedName = ingredient.supplyName
    .trim()
    .toLocaleLowerCase('es-MX');

  if (!normalizedName) {
    return;
  }

  const matchedSupply = (supplyItems.value ?? []).find(
    (item) => item.nombre.trim().toLocaleLowerCase('es-MX') === normalizedName,
  );

  if (!matchedSupply) {
    return;
  }

  ingredient.supplyDescription ||= matchedSupply.descripcion;
  ingredient.supplyCode ||= matchedSupply.codigo ?? '';
  ingredient.supplyUnitBase = matchedSupply.unidadBase;
  ingredient.supplyCategoryName ||= matchedSupply.category?.nombre ?? '';
  if (!ingredient.supplyTags.length) {
    ingredient.supplyTags = normalizeTags(matchedSupply.tags);
  }
  ingredient.supplyCostoReferencial ??= matchedSupply.costoReferencial;
  ingredient.supplyMermaPorcentaje ??= matchedSupply.mermaPorcentaje;
  ingredient.supplyCalorias ??= matchedSupply.calorias ?? null;
  ingredient.supplyProteina ??= matchedSupply.proteina ?? null;
  ingredient.supplyCarbohidratos ??= matchedSupply.carbohidratos ?? null;
  ingredient.supplyGrasas ??= matchedSupply.grasas ?? null;
  ingredient.supplyFibra ??= matchedSupply.fibra ?? null;
  ingredient.supplyAzucar ??= matchedSupply.azucar ?? null;
  ingredient.supplySodio ??= matchedSupply.sodio ?? null;
  ingredient.supplyNutritionBasis ??= matchedSupply.nutritionBasis ?? null;
  ingredient.supplyDefaultServingSize ??=
    matchedSupply.defaultServingSize ?? null;
  ingredient.supplyDefaultServingUnit ??=
    matchedSupply.defaultServingUnit ?? null;
  ingredient.supplyDensidad ??= matchedSupply.densidad ?? null;
}

async function hydrateIngredientNutritionFromLookup() {
  const supplyName = ingredientDraft.supplyName.trim();

  if (!supplyName || isHydratingIngredientNutrition.value) {
    return;
  }

  isHydratingIngredientNutrition.value = true;

  try {
    const result = await $fetch<IngredientNutritionLookupResponse>(
      '/api/admin/supplies/lookup',
      {
      method: 'POST',
      body: {
        name: supplyName,
        description: ingredientDraft.supplyDescription.trim(),
        codigo: ingredientDraft.supplyCode.trim() || null,
        unidadBase: ingredientDraft.supplyUnitBase,
      },
    },
    );

    resetIngredientNutritionReview();

    const usdaMatch = result.providerMatches?.find(
      (match) => match.source === 'USDA',
    );
    const fatSecretMatch = result.providerMatches?.find(
      (match) => match.source === 'FATSECRET',
    );

    if (!usdaMatch?.normalized && !fatSecretMatch?.normalized && !result?.normalized) {
      toast.add({
        title: 'No encontramos datos nutricionales',
        description:
          'No hubo respuesta útil para revisar este insumo.',
        color: 'warning',
        icon: 'i-lucide-circle-alert',
      });
      return;
    }

    syncIngredientNutritionReview(
      'USDA',
      buildIngredientNutritionReviewFromLookup('USDA', usdaMatch),
    );
    syncIngredientNutritionReview(
      'FATSECRET',
      buildIngredientNutritionReviewFromLookup('FATSECRET', fatSecretMatch),
    );

    if (
      !usdaMatch &&
      !fatSecretMatch &&
      result?.normalized
    ) {
      const fallbackSource =
        result.source === 'FATSECRET' ? 'FATSECRET' : 'USDA';

      syncIngredientNutritionReview(fallbackSource, {
        available: true,
        message: 'Resultado disponible para revisión.',
        matchedName: result.normalized.matchedName ?? result.normalized.name ?? '',
        source: fallbackSource,
        confidence: result.confidence ?? null,
        supplyCalorias: result.normalized.calories ?? null,
        supplyProteina: result.normalized.protein ?? null,
        supplyCarbohidratos: result.normalized.carbs ?? null,
        supplyGrasas: result.normalized.fat ?? null,
        supplyFibra: result.normalized.fiber ?? null,
        supplyAzucar: result.normalized.sugar ?? null,
        supplySodio: result.normalized.sodium ?? null,
        supplyNutritionBasis: result.normalized.nutritionBasis ?? null,
        supplyDefaultServingSize: result.normalized.defaultServingSize ?? null,
        supplyDefaultServingUnit: result.normalized.defaultServingUnit ?? null,
        supplyDensidad: result.normalized.density ?? null,
      });
    }

    if (ingredientNutritionReviewDrafts.USDA.available) {
      activeIngredientNutritionReviewTab.value = 'USDA';
    } else if (ingredientNutritionReviewDrafts.FATSECRET.available) {
      activeIngredientNutritionReviewTab.value = 'FATSECRET';
    }

    ingredientNutritionReviewOpen.value = true;
  } catch (error) {
    toast.add({
      title: 'No se pudieron obtener los datos nutricionales',
      description:
        error instanceof Error
          ? error.message
          : 'Inténtalo de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
  } finally {
    isHydratingIngredientNutrition.value = false;
  }
}

function applyReviewedIngredientNutrition() {
  const selectedDraft = activeIngredientNutritionReviewDraft.value;

  if (!selectedDraft.available) {
    toast.add({
      title: 'No hay datos para aplicar',
      description: 'Selecciona una coincidencia válida antes de continuar.',
      color: 'warning',
      icon: 'i-lucide-circle-alert',
    });
    return;
  }

  ingredientDraft.supplyCalorias =
    selectedDraft.supplyCalorias;
  ingredientDraft.supplyProteina =
    selectedDraft.supplyProteina;
  ingredientDraft.supplyCarbohidratos =
    selectedDraft.supplyCarbohidratos;
  ingredientDraft.supplyGrasas = selectedDraft.supplyGrasas;
  ingredientDraft.supplyFibra = selectedDraft.supplyFibra;
  ingredientDraft.supplyAzucar = selectedDraft.supplyAzucar;
  ingredientDraft.supplySodio = selectedDraft.supplySodio;
  ingredientDraft.supplyNutritionBasis =
    selectedDraft.supplyNutritionBasis;
  ingredientDraft.supplyDefaultServingSize =
    selectedDraft.supplyDefaultServingSize;
  ingredientDraft.supplyDefaultServingUnit =
    selectedDraft.supplyDefaultServingUnit;
  ingredientDraft.supplyDensidad =
    selectedDraft.supplyDensidad;

  ingredientNutritionReviewOpen.value = false;

  toast.add({
    title: 'Datos nutricionales aplicados',
    description:
      'Ya puedes revisar los macronutrientes calculados para este insumo.',
    color: 'success',
    icon: 'i-lucide-check-circle',
  });
}

function closeIngredientNutritionReview() {
  ingredientNutritionReviewOpen.value = false;
}

function validateIngredientDraft() {
  resetIngredientValidationState();

  if (!ingredientDraft.supplyName.trim()) {
    ingredientFieldErrors.supplyName = 'required';
  }

  if (
    ingredientDraft.cantidad === null ||
    ingredientDraft.cantidad === undefined ||
    Number.isNaN(Number(ingredientDraft.cantidad))
  ) {
    ingredientFieldErrors.cantidad = 'required';
  }

  if (!ingredientDraft.supplyCategoryName.trim()) {
    ingredientFieldErrors.supplyCategoryName = 'required';
  }

  const hasErrors = Object.values(ingredientFieldErrors).some(Boolean);

  if (hasErrors) {
    toast.add({
      title: 'No se pudo guardar el insumo',
      description:
        'Es necesario llenar los campos en rojo para poder guardar el insumo.',
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
  }

  return !hasErrors;
}

function saveIngredientDraft() {
  if (!validateIngredientDraft()) {
    return;
  }

  const editingIndex = editingIngredientIndex.value;

  const nextIngredient = {
    supplyName: ingredientDraft.supplyName.trim(),
    supplyDescription: ingredientDraft.supplyDescription.trim(),
    supplyCode: ingredientDraft.supplyCode.trim(),
    supplyUnitBase: ingredientDraft.supplyUnitBase,
    supplyCategoryName: ingredientDraft.supplyCategoryName.trim(),
    supplyTags: normalizeTags(ingredientDraft.supplyTags),
    supplyCostoReferencial: ingredientDraft.supplyCostoReferencial,
    supplyMermaPorcentaje: ingredientDraft.supplyMermaPorcentaje,
    supplyCalorias: ingredientDraft.supplyCalorias,
    supplyProteina: ingredientDraft.supplyProteina,
    supplyCarbohidratos: ingredientDraft.supplyCarbohidratos,
    supplyGrasas: ingredientDraft.supplyGrasas,
    supplyFibra: ingredientDraft.supplyFibra,
    supplyAzucar: ingredientDraft.supplyAzucar,
    supplySodio: ingredientDraft.supplySodio,
    supplyNutritionBasis: ingredientDraft.supplyNutritionBasis,
    supplyDefaultServingSize: ingredientDraft.supplyDefaultServingSize,
    supplyDefaultServingUnit: ingredientDraft.supplyDefaultServingUnit,
    supplyDensidad: ingredientDraft.supplyDensidad,
    grupo: ingredientDraft.grupo.trim(),
    cantidad: ingredientDraft.cantidad,
    unidad: ingredientDraft.unidad,
    notas: ingredientDraft.notas.trim(),
    opcional: ingredientDraft.opcional,
  } satisfies RecipeIngredientFormState;

  ingredientModalOpen.value = false;
  pendingIngredientModalCloseAction.value = () => {
    if (editingIndex === null) {
      state.recipe.ingredients.push(nextIngredient);
    } else if (state.recipe.ingredients[editingIndex]) {
      state.recipe.ingredients[editingIndex] = nextIngredient;
    }

    editingIngredientIndex.value = null;
    syncIngredientDraft();
    resetIngredientValidationState();
  };
}

function handleIngredientModalAfterLeave() {
  pendingIngredientModalCloseAction.value?.();
  pendingIngredientModalCloseAction.value = null;
}

function openRecipeDocumentModal(field: 'instrucciones' | 'notas') {
  activeRecipeDocumentField.value = field;
  recipeDocumentModalOpen.value = true;
}

async function persistFoodCatalogItem(payload: FoodCatalogItemInput) {
  isSubmitting.value = true;

  try {
    await saveFoodCatalogItem(payload, props.item?.id);

    toast.add({
      title: props.mode === 'edit' ? 'Platillo actualizado' : 'Platillo creado',
      description:
        props.mode === 'edit'
          ? 'Los cambios del platillo y su receta ya quedaron guardados.'
          : 'Ya puedes usar este platillo y su receta dentro de tus menús.',
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
    pendingSavePayload.value = null;
  }
}

async function confirmZeroCaloriesSave() {
  if (!pendingSavePayload.value || isSubmitting.value) {
    zeroCaloriesModalOpen.value = false;
    return;
  }

  zeroCaloriesModalOpen.value = false;
  await persistFoodCatalogItem(pendingSavePayload.value);
}

async function createSupplyCategoryOption(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue || isCreatingSupplyCategory.value) {
    return;
  }

  const existingCategory = (supplyCategories.value ?? []).find(
    (category) =>
      category.nombre.trim().toLocaleLowerCase('es-MX') ===
      normalizedValue.toLocaleLowerCase('es-MX'),
  );

  if (existingCategory) {
    ingredientDraft.supplyCategoryName = existingCategory.nombre;
    return;
  }

  isCreatingSupplyCategory.value = true;

  try {
    const createdCategory = await saveSupplyCategory({
      nombre: normalizedValue,
      descripcion: '',
      isActive: true,
      sortOrder: (supplyCategories.value ?? []).length,
    });

    ingredientDraft.supplyCategoryName = createdCategory.nombre;
    await refreshSupplyCategories();
  } catch (error) {
    toast.add({
      title: 'No pudimos crear la categoría',
      description:
        error instanceof Error
          ? error.message
          : 'Inténtalo de nuevo en unos segundos.',
      color: 'error',
      icon: 'i-lucide-circle-alert',
    });
  } finally {
    isCreatingSupplyCategory.value = false;
  }
}

function createIngredientGroupOption(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return;
  }

  const alreadyExists = [
    ...(recipeIngredientGroups.value ?? []),
    ...state.recipe.ingredients.map((ingredient) => ingredient.grupo.trim()),
    ...createdIngredientGroupOptions.value,
  ].some(
    (groupName) =>
      groupName.trim().toLocaleLowerCase('es-MX') ===
      normalizedValue.toLocaleLowerCase('es-MX'),
  );

  if (!alreadyExists) {
    createdIngredientGroupOptions.value = [
      ...createdIngredientGroupOptions.value,
      normalizedValue,
    ];
  }

  ingredientDraft.grupo = normalizedValue;
}

function createIngredientTagOption(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return;
  }

  ingredientDraft.supplyTags = normalizeTags([
    ...ingredientDraft.supplyTags,
    normalizedValue,
  ]);
}

function createSupplyItemOption(value: string) {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return;
  }

  const alreadyExists = [
    ...(supplyItems.value ?? []).map((item) => item.nombre),
    ...createdSupplyItemOptions.value,
  ].some(
    (itemName) =>
      itemName.trim().toLocaleLowerCase('es-MX') ===
      normalizedValue.toLocaleLowerCase('es-MX'),
  );

  if (!alreadyExists) {
    createdSupplyItemOptions.value = [
      ...createdSupplyItemOptions.value,
      normalizedValue,
    ];
  }

  ingredientDraft.supplyName = normalizedValue;
}

function buildPayload(): FoodCatalogItemInput {
  return {
    nombre: state.nombre.trim(),
    descripcion: state.descripcion.trim(),
    calorias: recipeCaloriesTotal.value,
    imagen: state.imagen.trim(),
    tipo: state.tipo?.trim() ?? '',
    recipe: recipeHasContent(state.recipe)
      ? {
          status: state.recipe.status,
          porciones: toNullableNumber(state.recipe.porciones),
          rendimientoCantidad: toNullableNumber(
            state.recipe.rendimientoCantidad,
          ),
          rendimientoUnidad: state.recipe.rendimientoUnidad ?? null,
          tiempoPreparacionMin: toNullableNumber(
            state.recipe.tiempoPreparacionMin,
          ),
          tiempoCoccionMin: toNullableNumber(state.recipe.tiempoCoccionMin),
          instrucciones: state.recipe.instrucciones.trim(),
          notas: state.recipe.notas.trim(),
          ingredients: state.recipe.ingredients
            .filter(ingredientHasContent)
            .map((ingredient) => ({
              supplyName: ingredient.supplyName.trim(),
              supplyDescription: ingredient.supplyDescription.trim(),
              supplyCode: ingredient.supplyCode.trim() || null,
              supplyUnitBase: ingredient.supplyUnitBase,
              supplyCategoryName: ingredient.supplyCategoryName.trim() || null,
              supplyTags: normalizeTags(ingredient.supplyTags),
              supplyCostoReferencial: toNullableNumber(
                ingredient.supplyCostoReferencial,
              ),
              supplyMermaPorcentaje: toNullableNumber(
                ingredient.supplyMermaPorcentaje,
              ),
              supplyCalorias: toNullableNumber(ingredient.supplyCalorias),
              supplyProteina: toNullableNumber(ingredient.supplyProteina),
              supplyCarbohidratos: toNullableNumber(
                ingredient.supplyCarbohidratos,
              ),
              supplyGrasas: toNullableNumber(ingredient.supplyGrasas),
              supplyFibra: toNullableNumber(ingredient.supplyFibra),
              supplyAzucar: toNullableNumber(ingredient.supplyAzucar),
              supplySodio: toNullableNumber(ingredient.supplySodio),
              supplyNutritionBasis:
                ingredient.supplyNutritionBasis
                ?? resolveNutritionBasisFromSupplyUnit(ingredient.supplyUnitBase),
              supplyDefaultServingSize: toNullableNumber(
                ingredient.supplyDefaultServingSize
                ?? resolveNutritionServingSizeFromSupplyUnit(ingredient.supplyUnitBase),
              ),
              supplyDefaultServingUnit:
                ingredient.supplyDefaultServingUnit
                ?? resolveNutritionServingUnitFromSupplyUnit(ingredient.supplyUnitBase),
              supplyDensidad: toNullableNumber(ingredient.supplyDensidad),
              grupo: ingredient.grupo.trim() || null,
              cantidad: Number(ingredient.cantidad) || 0,
              unidad: ingredient.unidad,
              notas: ingredient.notas.trim(),
              opcional: ingredient.opcional,
            })),
        }
      : null,
  };
}

function isPayloadValid() {
  const parsed = foodCatalogItemInputSchema.safeParse(buildPayload());

  if (!parsed.success) {
    return false;
  }

  return !findDuplicateName(parsed.data.nombre);
}

watch(
  () => props.item,
  (item) => {
    syncState(item);
  },
  { immediate: true },
);

watch(
  () => ingredientModalOpen.value,
  (isOpen) => {
    if (!isOpen) return;

    activeIngredientMacroTab.value = 'actual';
  },
);

watch(
  () => ingredientDraft.supplyUnitBase,
  (unit) => {
    syncIngredientNutritionBaseFromSupplyUnit(unit);
  },
);

watch(
  () => recipeCaloriesTotal.value,
  (value) => {
    state.calorias = value;
  },
  { immediate: true },
);

const isDirty = computed(() => JSON.stringify(state) !== initialSnapshot.value);
const isFormValid = computed(() => isPayloadValid());

watch(
  () => isDirty.value,
  (value) => {
    emit('dirty-change', value);
  },
  { immediate: true },
);

watch(
  () => isFormValid.value,
  (value) => {
    emit('validity-change', value);
  },
  { immediate: true },
);

watch(
  () => isSubmitting.value,
  (value) => {
    emit('submit-state-change', value);
  },
  { immediate: true },
);

watch(
  () => ingredientListTabs.value,
  (tabs) => {
    if (!tabs.some((tab) => tab.value === activeIngredientGroupTab.value)) {
      activeIngredientGroupTab.value = 'todos';
    }
  },
  { immediate: true },
);

watch(
  () => ingredientDraft.supplyName,
  (value) => {
    if (value.trim()) {
      ingredientFieldErrors.supplyName = '';
    }
  },
);

watch(
  () => ingredientDraft.cantidad,
  (value) => {
    if (
      value !== null &&
      value !== undefined &&
      !Number.isNaN(Number(value))
    ) {
      ingredientFieldErrors.cantidad = '';
    }
  },
);

watch(
  () => ingredientDraft.supplyCategoryName,
  (value) => {
    if (value.trim()) {
      ingredientFieldErrors.supplyCategoryName = '';
    }
  },
);

async function onSubmit() {
  if (isSubmitting.value) {
    return;
  }

  resetValidationState();

  const payload = buildPayload();

  const parsed = foodCatalogItemInputSchema.safeParse(payload);

  if (!parsed.success) {
    parsed.error.issues.forEach((issue) => {
      const fieldName = issue.path[0];

      if (
        typeof fieldName === 'string' &&
        fieldName in fieldErrors &&
        fieldName !== 'recipe'
      ) {
        const typedFieldName = fieldName as Exclude<FieldErrorKey, 'recipe'>;
        if (!fieldErrors[typedFieldName]) {
          fieldErrors[typedFieldName] = issue.message;
        }
        return;
      }

      recipeIssues.value.push(issue.message);
    });

    recipeIssues.value = Array.from(new Set(recipeIssues.value));
    fieldErrors.recipe = recipeIssues.value[0] ?? '';
    showValidationToast();
    return;
  }

  const duplicateItem = findDuplicateName(parsed.data.nombre);

  if (duplicateItem) {
    fieldErrors.nombre = 'Ya existe un platillo con ese nombre.';
    showValidationToast();
    return;
  }

  if (parsed.data.calorias === 0) {
    pendingSavePayload.value = parsed.data;
    zeroCaloriesModalOpen.value = true;
    return;
  }

  await persistFoodCatalogItem(parsed.data);
}
</script>

<template>
  <UForm
    :id="formId"
    :state="state"
    :errors="formErrors"
    class="grid items-start gap-6"
    @submit.prevent="onSubmit"
  >
    <div class="space-y-6">
      <div class="grid gap-4 md:grid-cols-2 lg:hidden">
        <UCard class="app-surface-soft" :ui="{ body: 'space-y-5 p-5 sm:p-6' }">
          <div
            class="overflow-hidden rounded-none border border-default/70 bg-default"
          >
            <div
              v-if="loadingSidebar"
              class="flex aspect-4/3 items-center justify-center rounded-none bg-[radial-gradient(circle_at_top,#00dc8220,transparent_55%)]"
            >
              <USkeleton class="h-full w-full rounded-none" />
            </div>
            <div
              v-else-if="state.imagen"
              class="aspect-4/3 overflow-hidden rounded-none"
            >
              <img
                :src="state.imagen"
                :alt="state.nombre || 'Vista previa del platillo'"
                class="h-full w-full object-cover"
              />
            </div>
            <div
              v-else
              class="flex aspect-4/3 items-center justify-center rounded-none bg-[radial-gradient(circle_at_top,#00dc8220,transparent_55%)] text-muted"
            >
              <div class="text-center">
                <UIcon name="i-lucide-image" class="mx-auto mb-2 size-8" />
                <p class="text-sm">Agrega una imagen para verla aquí</p>
              </div>
            </div>
          </div>

            <div class="space-y-2">
              <div class="flex flex-wrap items-center gap-2">
                <USkeleton v-if="loadingSidebar" class="h-6 w-20 rounded-full" />
                <UBadge v-else color="primary" variant="subtle">
                  {{ state.tipo || 'Sin tipo' }}
                </UBadge>
                <USkeleton v-if="loadingSidebar" class="h-6 w-16 rounded-full" />
                <UBadge v-else color="neutral" variant="soft">
                  {{ state.calorias || 0 }} kcal
                </UBadge>
                <UBadge color="warning" variant="soft">
                  {{ formatEnumLabel(state.recipe.status) }}
                </UBadge>
              </div>

              <USkeleton v-if="loadingSidebar" class="h-7 w-2/3" />
              <h3 v-else class="text-lg font-semibold text-highlighted">
                {{ state.nombre || 'Nombre pendiente' }}
              </h3>
              <USkeleton v-if="loadingSidebar" class="h-5 w-full" />
              <p v-else class="text-sm text-toned">
                {{
                  state.descripcion ||
                  'Aquí verás un resumen rápido del platillo mientras lo capturas.'
                }}
              </p>
          </div>
        </UCard>

        <UCard class="app-surface-soft" :ui="{ body: 'p-5 sm:p-6' }">
          <div class="space-y-4">
            <div class="flex items-center gap-2">
              <UIcon
                name="i-lucide-notebook-tabs"
                class="size-4 text-primary"
              />
              <h4 class="text-sm font-semibold text-primary">
                Menús vinculados
              </h4>
            </div>

            <div v-if="loadingSidebar" class="space-y-2">
              <USkeleton class="h-10 w-full" />
              <USkeleton class="h-10 w-full" />
            </div>

            <div v-else-if="item?.linkedMenus?.length" class="space-y-2">
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

      <UCard class="app-surface self-start" :ui="{ body: 'p-6' }">
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-primary">
            Información general del platillo
          </h2>
        </div>

        <div class="mt-4 space-y-5">
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            title="No se pudo guardar"
            :description="errorMessage"
          />

          <div
            class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.82fr)] lg:items-start"
          >
            <div class="space-y-5">
              <UFormField
                name="nombre"
                :error="false"
                label="Nombre"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <UInput
                  v-model="state.nombre"
                  class="w-full"
                  :disabled="isFormHydrating"
                  :color="
                    fieldErrors.nombre
                      ? 'error'
                      : mode === 'create'
                        ? 'primary'
                        : 'neutral'
                  "
                  size="xl"
                  :placeholder="
                    isFormHydrating
                      ? 'Cargando...'
                      : 'Ej. Bowl de pollo con arroz integral'
                  "
                />
              </UFormField>

              <UFormField
                name="tipo"
                :error="false"
                label="Tipo"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <USelect
                  v-model="state.tipo"
                  :items="foodTypeOptions"
                  class="w-full"
                  :disabled="isFormHydrating"
                  :color="fieldErrors.tipo ? 'error' : 'primary'"
                  size="xl"
                  :placeholder="
                    isFormHydrating ? 'Cargando...' : 'Selecciona un tipo'
                  "
                  :ui="{
                    content: '!max-h-none',
                    viewport: '!overflow-visible',
                  }"
                />
              </UFormField>

              <UFormField
                name="descripcion"
                label="Descripción"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <UTextarea
                  v-model="state.descripcion"
                  class="w-full"
                  :disabled="isFormHydrating"
                  :rows="5"
                  :ui="{ base: 'min-h-34 resize-none' }"
                  :placeholder="
                    isFormHydrating
                      ? 'Cargando...'
                      : 'Describe rápidamente el platillo, ingredientes o notas internas.'
                  "
                />
              </UFormField>

              <UFormField
                name="imagen"
                label="URL de imagen"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <UInput
                  v-model="state.imagen"
                  class="w-full"
                  :disabled="isFormHydrating"
                  type="url"
                  size="xl"
                  :placeholder="isFormHydrating ? 'Cargando...' : 'https://...'"
                />
              </UFormField>
            </div>

            <div class="hidden content-start gap-4 lg:grid">
                <UCard class="app-surface-soft" :ui="{ body: 'space-y-5 p-5' }">
                  <div
                    class="overflow-hidden rounded-none border border-default/70 bg-default"
                  >
                    <div
                      v-if="loadingSidebar"
                      class="flex aspect-4/3 items-center justify-center rounded-none bg-[radial-gradient(circle_at_top,#00dc8220,transparent_55%)]"
                    >
                      <USkeleton class="h-full w-full rounded-none" />
                    </div>
                    <div
                      v-else-if="state.imagen"
                      class="aspect-4/3 overflow-hidden rounded-none"
                    >
                      <img
                        :src="state.imagen"
                        :alt="state.nombre || 'Vista previa del platillo'"
                        class="h-full w-full object-cover"
                      />
                    </div>
                    <div
                      v-else
                      class="flex aspect-4/3 items-center justify-center rounded-none bg-[radial-gradient(circle_at_top,#00dc8220,transparent_55%)] text-muted"
                    >
                      <div class="text-center">
                        <UIcon
                          name="i-lucide-image"
                          class="mx-auto mb-2 size-8"
                        />
                        <p class="text-sm">Agrega una imagen para verla aquí</p>
                      </div>
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <USkeleton v-if="loadingSidebar" class="h-6 w-20 rounded-full" />
                      <UBadge v-else color="primary" variant="subtle">
                        {{ state.tipo || 'Sin tipo' }}
                      </UBadge>
                      <USkeleton v-if="loadingSidebar" class="h-6 w-16 rounded-full" />
                      <UBadge v-else color="neutral" variant="soft">
                        {{ state.calorias || 0 }} kcal
                      </UBadge>
                      <USkeleton
                        v-if="loadingSidebar"
                        class="h-6 w-20 rounded-full"
                      />
                      <UBadge
                        v-else-if="!state.recipe.ingredients.length"
                        color="warning"
                        variant="soft"
                      >
                        Sin receta
                      </UBadge>
                    </div>

                    <USkeleton v-if="loadingSidebar" class="h-7 w-2/3" />
                    <h3 v-else class="text-lg font-semibold text-highlighted">
                      {{ state.nombre || 'Nombre pendiente' }}
                    </h3>
                    <USkeleton v-if="loadingSidebar" class="h-5 w-full" />
                    <p v-else class="text-sm text-toned">
                      {{
                        state.descripcion ||
                        'Aquí verás un resumen rápido del platillo mientras lo capturas.'
                      }}
                    </p>
                  </div>
                </UCard>

                <UCard class="app-surface-soft" :ui="{ body: 'p-5' }">
                  <div class="space-y-4">
                    <div class="flex items-center gap-2">
                      <UIcon
                        name="i-lucide-notebook-tabs"
                        class="size-4 text-primary"
                      />
                      <h4 class="text-sm font-semibold text-primary">
                        Menús vinculados
                      </h4>
                    </div>

                    <div v-if="loadingSidebar" class="space-y-2">
                      <USkeleton class="h-10 w-full" />
                      <USkeleton class="h-10 w-full" />
                    </div>

                    <div v-else-if="item?.linkedMenus?.length" class="space-y-2">
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
          </div>
        </div>

        <div
          v-if="item || !hideSubmit"
          class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p v-if="item" class="text-sm text-muted">
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

      <UCard class="app-surface" :ui="{ body: 'p-5 sm:p-6' }">
        <div class="space-y-1">
          <h2 class="text-xl font-semibold text-primary">Receta</h2>
        </div>

        <div class="mt-5 space-y-5">
          <UAlert
            v-if="recipeIssues.length"
            color="warning"
            variant="soft"
            icon="i-lucide-triangle-alert"
            title="Revisa la receta"
            :description="recipeIssues.join(' ')"
          />

          <div class="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            <UFormField
              label="Estado de receta"
              :ui="{ label: 'font-semibold text-highlighted' }"
            >
              <USelect
                v-model="state.recipe.status"
                :items="recipeStatusOptions"
                class="w-full"
                :disabled="isFormHydrating"
              />
            </UFormField>

            <UFormField
              label="Porciones"
              :ui="{ label: 'font-semibold text-highlighted' }"
            >
              <UInput
                v-model.number="state.recipe.porciones"
                class="w-full"
                :disabled="isFormHydrating"
                type="number"
                min="1"
                :placeholder="isFormHydrating ? 'Cargando...' : 'Ej. 1'"
              />
            </UFormField>

            <UFormField
              label="Rendimiento"
              :ui="{ label: 'font-semibold text-highlighted' }"
            >
              <UInput
                v-model.number="state.recipe.rendimientoCantidad"
                class="w-full"
                :disabled="isFormHydrating"
                type="number"
                min="0"
                step="0.01"
                :placeholder="isFormHydrating ? 'Cargando...' : 'Ej. 350'"
              />
            </UFormField>

            <UFormField
              label="Unidad de rendimiento"
              :ui="{ label: 'font-semibold text-highlighted' }"
            >
              <USelect
                v-model="state.recipe.rendimientoUnidad"
                :items="unitOptions"
                label-key="label"
                value-key="value"
                class="w-full"
                :disabled="isFormHydrating"
                :placeholder="
                  isFormHydrating ? 'Cargando...' : 'Selecciona una unidad'
                "
              />
            </UFormField>
          </div>

          <div class="space-y-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3
                class="text-sm font-semibold uppercase tracking-[0.18em] text-primary"
              >
                Lista de insumos
              </h3>
              <div class="flex flex-wrap items-center gap-3">
                <span class="text-sm text-muted">
                  {{ ingredientCount }}
                  {{ ingredientCount === 1 ? 'insumo' : 'insumos' }}
                </span>

                <UButton
                  color="primary"
                  variant="soft"
                  icon="i-lucide-plus"
                  class="cursor-pointer"
                  @click="openCreateIngredientModal"
                >
                  Agregar insumo
                </UButton>
              </div>
            </div>

            <div
              v-if="!state.recipe.ingredients.length"
              class="rounded-xl border border-dashed border-default p-4 text-sm text-muted"
            >
              Agrega el primer insumo para empezar a construir la receta.
            </div>

            <UTabs
              v-else
              v-model="activeIngredientGroupTab"
              :items="ingredientListTabs"
              color="primary"
              variant="pill"
              size="sm"
              :ui="{
                root: 'w-full gap-4',
                list: 'w-full overflow-x-auto rounded-xl bg-elevated p-1',
                trigger: 'shrink-0',
                content: 'w-full',
              }"
            >
              <template #content>
                <div
                  class="overflow-hidden rounded-xl border border-default bg-default/40"
                >
                  <article
                    v-for="{ ingredient, index } in filteredIngredients"
                    :key="`ingredient-${index}`"
                    class="border-b border-default/70 px-4 py-3.5 last:border-b-0"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        class="min-w-0 flex-1 space-y-1.5 rounded-lg text-left transition-colors hover:bg-elevated/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                        @click="openEditIngredientModal(index)"
                      >
                        <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <h4 class="text-base leading-6 text-highlighted">
                            <span class="font-semibold">
                              {{ ingredient.cantidad ?? 0 }}
                              {{
                                formatRecipeUnitLabel(
                                  ingredient.unidad,
                                  ingredient.cantidad,
                                )
                              }}
                            </span>
                            <span class="text-muted"> de </span>
                            <span class="font-semibold">
                              {{ ingredient.supplyName || 'insumo sin nombre' }}
                            </span>
                          </h4>
                          <span
                            v-if="ingredient.opcional"
                            class="text-sm text-warning"
                          >
                            opcional
                          </span>
                        </div>

                        <p
                          v-if="
                            ingredient.supplyDescription ||
                            ingredient.notas
                          "
                          class="text-sm leading-6 text-muted"
                        >
                          {{
                            ingredient.supplyDescription ||
                            ingredient.notas
                          }}
                        </p>
                      </button>

                      <UBadge
                        v-if="
                          ingredient.grupo &&
                          activeIngredientGroupTab === 'todos'
                        "
                        color="neutral"
                        variant="subtle"
                        class="shrink-0 self-start"
                      >
                        {{ formatSelectMenuLabel(ingredient.grupo) }}
                      </UBadge>
                    </div>
                  </article>
                </div>
              </template>
            </UTabs>
          </div>

          <div class="space-y-4">
            <h3
              class="text-sm font-semibold uppercase tracking-[0.18em] text-primary"
            >
              Instrucciones y notas
            </h3>

            <div class="grid gap-5 lg:grid-cols-2">
              <UFormField
                label="Instrucciones"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <button
                  type="button"
                  class="flex h-36 w-full cursor-pointer items-start rounded-md bg-default px-3 py-2 text-left ring ring-inset ring-accented transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-75"
                  :disabled="isFormHydrating"
                  @click="openRecipeDocumentModal('instrucciones')"
                >
                  <span
                    class="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-6"
                    :class="
                      isFormHydrating
                        ? 'text-dimmed'
                        : state.recipe.instrucciones
                        ? 'text-highlighted'
                        : 'text-dimmed'
                    "
                  >
                    {{
                      isFormHydrating
                        ? 'Cargando...'
                        :
                      state.recipe.instrucciones ||
                      'Detalla pasos, orden de producción y puntos críticos.'
                    }}
                  </span>
                </button>
              </UFormField>

              <UFormField
                label="Notas operativas"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <button
                  type="button"
                  class="flex h-36 w-full cursor-pointer items-start rounded-md bg-default px-3 py-2 text-left ring ring-inset ring-accented transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-75"
                  :disabled="isFormHydrating"
                  @click="openRecipeDocumentModal('notas')"
                >
                  <span
                    class="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm leading-6"
                    :class="
                      isFormHydrating
                        ? 'text-dimmed'
                        : state.recipe.notas ? 'text-highlighted' : 'text-dimmed'
                    "
                  >
                    {{
                      isFormHydrating
                        ? 'Cargando...'
                        :
                      state.recipe.notas ||
                      'Notas internas, empaque, reposo, conservación o montaje.'
                    }}
                  </span>
                </button>
              </UFormField>
            </div>
          </div>
        </div>

        <datalist id="supply-items-list">
          <option
            v-for="supply in supplyItems"
            :key="supply.id"
            :value="supply.nombre"
          />
        </datalist>

        <datalist id="supply-categories-list">
          <option
            v-for="category in supplyCategories"
            :key="category.id"
            :value="category.nombre"
          />
        </datalist>
      </UCard>
    </div>

    <UModal
      v-model:open="ingredientModalOpen"
      :title="isCreatingIngredient ? 'Agregar insumo' : 'Modificar insumo'"
      :description="
        isCreatingIngredient
          ? 'Captura todos los detalles del insumo que formará parte de la receta.'
          : 'Actualiza la información operativa y de receta para este insumo.'
      "
      :ui="{ content: 'max-w-4xl' }"
      @after:leave="handleIngredientModalAfterLeave"
    >
      <template #body>
        <div class="space-y-5">
          <div
            class="rounded-xl border border-default/70 bg-elevated/20 p-4 sm:p-5"
          >
            <div class="mb-4 space-y-1">
              <h3
                class="text-sm font-semibold uppercase tracking-[0.18em] text-primary"
              >
                Datos principales
              </h3>
              <p class="text-sm text-muted">
                Captura el insumo y la cantidad que se usa en la receta.
              </p>
            </div>

            <div class="grid gap-4 lg:grid-cols-2 ingredient-modal-titlecase">
              <UFormField
                label="Insumo"
                :error="false"
                required
                :ui="{
                  label: 'font-semibold text-highlighted',
                  labelWrapper: 'items-center',
                }"
              >
                <USelectMenu
                  v-model="ingredientDraft.supplyName"
                  :items="supplyItemOptions"
                  label-key="label"
                  value-key="value"
                  class="w-full"
                  :color="ingredientFieldErrors.supplyName ? 'error' : 'primary'"
                  :highlight="Boolean(ingredientFieldErrors.supplyName)"
                  placeholder="Buscar..."
                  :create-item="true"
                  :search-input="{ placeholder: 'Buscar...' }"
                  @create="createSupplyItemOption"
                  @update:model-value="
                    hydrateIngredientFromCatalog(ingredientDraft)
                  "
                />
              </UFormField>

              <UFormField
                label="Cantidad"
                :error="false"
                required
                :ui="{
                  label: 'font-semibold text-highlighted',
                  labelWrapper: 'items-center',
                }"
              >
                <UInput
                  v-model.number="ingredientDraft.cantidad"
                  class="w-full"
                  :color="ingredientFieldErrors.cantidad ? 'error' : 'primary'"
                  :highlight="Boolean(ingredientFieldErrors.cantidad)"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                />
              </UFormField>

              <UFormField
                label="Unidad base del insumo"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <USelect
                  v-model="ingredientDraft.supplyUnitBase"
                  :items="unitOptions"
                  label-key="label"
                  value-key="value"
                  class="w-full"
                  @update:model-value="syncIngredientNutritionBaseFromSupplyUnit"
                />
              </UFormField>

              <UFormField
                label="Unidad de receta"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <USelect
                  v-model="ingredientDraft.unidad"
                  :items="unitOptions"
                  label-key="label"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>

              <UFormField
                label="Categoría"
                :error="false"
                required
                :ui="{
                  label: 'font-semibold text-highlighted',
                  labelWrapper: 'items-center',
                }"
              >
                <USelectMenu
                  v-model="ingredientDraft.supplyCategoryName"
                  :items="supplyCategoryOptions"
                  label-key="label"
                  value-key="value"
                  class="w-full"
                  :color="
                    ingredientFieldErrors.supplyCategoryName
                      ? 'error'
                      : 'primary'
                  "
                  :highlight="Boolean(ingredientFieldErrors.supplyCategoryName)"
                  placeholder="Selecciona o crea una categoría"
                  :search-input="{ placeholder: 'Buscar...' }"
                  :create-item="true"
                  :loading="isCreatingSupplyCategory"
                  @create="createSupplyCategoryOption"
                />
              </UFormField>

              <UFormField
                label="Grupo"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <USelectMenu
                  v-model="ingredientDraft.grupo"
                  :items="ingredientGroupOptions"
                  label-key="label"
                  value-key="value"
                  class="w-full"
                  placeholder="Selecciona o crea un grupo"
                  :search-input="{ placeholder: 'Buscar...' }"
                  :create-item="true"
                  @create="createIngredientGroupOption"
                />
              </UFormField>
            </div>
          </div>

          <div
            class="rounded-xl border border-default/70 bg-elevated/20 p-4 sm:p-5"
          >
            <div class="mb-4 space-y-1">
              <h3
                class="text-sm font-semibold uppercase tracking-[0.18em] text-primary"
              >
                Detalles operativos
              </h3>
              <p class="text-sm text-muted">
                Agrega información útil para compras, inventario y producción.
              </p>
            </div>

            <div class="grid gap-4 lg:grid-cols-3 ingredient-modal-titlecase">
              <UFormField
                label="Costo referencial"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <UInput
                  v-model.number="ingredientDraft.supplyCostoReferencial"
                  class="w-full"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </UFormField>

              <UFormField
                label="Merma %"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <UInput
                  v-model.number="ingredientDraft.supplyMermaPorcentaje"
                  class="w-full"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  placeholder="0"
                />
              </UFormField>

              <UFormField
                label="Tags"
                class="min-w-0"
                :ui="{ label: 'font-semibold text-highlighted' }"
              >
                <USelectMenu
                  v-model="ingredientDraft.supplyTags"
                  :items="supplyTagOptions"
                  label-key="label"
                  value-key="value"
                  class="w-full"
                  multiple
                  :create-item="true"
                  :search-input="{ placeholder: 'Buscar...' }"
                  placeholder="Selecciona uno o más tags"
                  @create="createIngredientTagOption"
                />
              </UFormField>
            </div>
          </div>

          <div
            class="rounded-xl border border-default/70 bg-elevated/20 p-4 sm:p-5"
          >
            <div
              class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div class="space-y-1">
                <h3
                  class="text-sm font-semibold uppercase tracking-[0.18em] text-primary"
                >
                  Macronutrientes
                </h3>
                <p class="max-w-md text-sm text-muted">
                  Prioridad visual en cálculo para cantidad actual. Base
                  nutricional queda abajo para edición manual o revisión.
                </p>
              </div>

              <UButton
                color="primary"
                variant="subtle"
                icon="i-lucide-search"
                class="cursor-pointer self-start"
                :loading="isHydratingIngredientNutrition"
                :disabled="!ingredientDraft.supplyName.trim()"
                @click="hydrateIngredientNutritionFromLookup"
              >
                {{
                  isHydratingIngredientNutrition
                    ? 'Buscando coincidencias...'
                    : 'Buscar en USDA'
                }}
              </UButton>
            </div>

            <p class="mb-4 text-xs text-muted">
              Base nutricional:
              {{
                formatIngredientNutritionBasisDisplay(ingredientDraft)
              }}
            </p>

            <UTabs
              v-model="activeIngredientMacroTab"
              :items="ingredientMacroTabs"
              color="primary"
              variant="pill"
              :ui="{
                root: 'w-full gap-4',
                list: 'w-full rounded-xl bg-elevated p-1',
                content: 'w-full',
              }"
            >
              <template #content>
                <div
                  v-if="activeIngredientMacroTab === 'actual'"
                >
                  <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div class="rounded-xl border border-default/70 bg-default p-4">
                      <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        Calorías
                      </p>
                      <p class="mt-2 text-2xl font-semibold text-highlighted">
                        {{ computedIngredientMacros.calories ?? '—' }}
                      </p>
                      <p class="mt-1 text-sm text-muted">kcal</p>
                    </div>

                    <div class="rounded-xl border border-default/70 bg-default p-4">
                      <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        Proteína
                      </p>
                      <p class="mt-2 text-xl font-semibold text-highlighted">
                        {{ computedIngredientMacros.protein ?? '—' }}
                      </p>
                      <p class="mt-1 text-sm text-muted">g</p>
                    </div>

                    <div class="rounded-xl border border-default/70 bg-default p-4">
                      <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        Carbohidratos
                      </p>
                      <p class="mt-2 text-xl font-semibold text-highlighted">
                        {{ computedIngredientMacros.carbs ?? '—' }}
                      </p>
                      <p class="mt-1 text-sm text-muted">g</p>
                    </div>

                    <div class="rounded-xl border border-default/70 bg-default p-4">
                      <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        Grasas
                      </p>
                      <p class="mt-2 text-xl font-semibold text-highlighted">
                        {{ computedIngredientMacros.fat ?? '—' }}
                      </p>
                      <p class="mt-1 text-sm text-muted">g</p>
                    </div>

                    <div class="rounded-xl border border-default/70 bg-default p-4">
                      <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        Fibra
                      </p>
                      <p class="mt-2 text-lg font-semibold text-highlighted">
                        {{ computedIngredientMacros.fiber ?? '—' }}
                      </p>
                      <p class="mt-1 text-sm text-muted">g</p>
                    </div>

                    <div class="rounded-xl border border-default/70 bg-default p-4">
                      <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        Azúcar
                      </p>
                      <p class="mt-2 text-lg font-semibold text-highlighted">
                        {{ computedIngredientMacros.sugar ?? '—' }}
                      </p>
                      <p class="mt-1 text-sm text-muted">g</p>
                    </div>

                    <div class="rounded-xl border border-default/70 bg-default p-4">
                      <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        Sodio
                      </p>
                      <p class="mt-2 text-lg font-semibold text-highlighted">
                        {{ computedIngredientMacros.sodium ?? '—' }}
                      </p>
                      <p class="mt-1 text-sm text-muted">mg</p>
                    </div>

                    <div class="rounded-xl border border-default/70 bg-default p-4">
                      <p class="text-xs font-medium uppercase tracking-[0.14em] text-muted">
                        Unidad base
                      </p>
                      <p class="mt-2 text-base font-semibold text-highlighted">
                        {{
                          formatEnumLabel(ingredientDraft.supplyUnitBase)
                        }}
                      </p>
                      <p class="mt-1 text-sm text-muted">referencia</p>
                    </div>
                  </div>
                </div>

                <div
                  v-else
                  class="rounded-xl border border-default/70 bg-default/50 p-4 sm:p-5"
                >
                  <p class="mb-4 text-sm text-muted">
                    Valores por pieza, 100 gramos o 100 mililitros según base nutricional.
                  </p>

                  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <UFormField
                      label="Calorías"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        v-model.number="ingredientDraft.supplyCalorias"
                        class="w-full"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </UFormField>

                    <UFormField
                      label="Proteína"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        v-model.number="ingredientDraft.supplyProteina"
                        class="w-full"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </UFormField>

                    <UFormField
                      label="Carbohidratos"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        v-model.number="ingredientDraft.supplyCarbohidratos"
                        class="w-full"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </UFormField>

                    <UFormField
                      label="Grasas"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        v-model.number="ingredientDraft.supplyGrasas"
                        class="w-full"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </UFormField>

                    <UFormField
                      label="Fibra"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        v-model.number="ingredientDraft.supplyFibra"
                        class="w-full"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </UFormField>

                    <UFormField
                      label="Azúcar"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        v-model.number="ingredientDraft.supplyAzucar"
                        class="w-full"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </UFormField>

                    <UFormField
                      label="Sodio"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        v-model.number="ingredientDraft.supplySodio"
                        class="w-full"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </UFormField>

                    <UFormField
                      label="Unidad base"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        :model-value="
                          formatEnumLabel(ingredientDraft.supplyUnitBase)
                        "
                        class="w-full"
                        readonly
                      />
                    </UFormField>
                  </div>

                  <div class="mt-4 rounded-xl border border-dashed border-default p-3 text-xs text-muted">
                    Si editas base, cálculo de tab anterior cambia en tiempo real según cantidad capturada.
                  </div>
                </div>
              </template>
            </UTabs>
          </div>
        </div>
      </template>

      <template #footer>
        <div
          class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <UButton
            v-if="!isCreatingIngredient"
            color="error"
            icon="i-lucide-trash-2"
            class="cursor-pointer"
            @click="confirmRemoveEditingIngredient"
          >
            Quitar insumo
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-save"
            class="cursor-pointer"
            @click="saveIngredientDraft"
          >
            {{ isCreatingIngredient ? 'Agregar insumo' : 'Guardar detalles' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="ingredientNutritionReviewOpen"
      title="Revisar datos nutricionales"
      description="Confirma que coincidencia sea correcta antes de aplicar datos al insumo."
      :ui="{ content: 'max-w-4xl' }"
    >
      <template #body>
        <UTabs
          v-model="activeIngredientNutritionReviewTab"
          :items="ingredientNutritionReviewTabs"
          color="primary"
          variant="pill"
          :ui="{
            root: 'w-full gap-4',
            list: 'w-full rounded-xl bg-elevated p-1',
            content: 'w-full',
          }"
        >
          <template #content>
            <div class="space-y-5">
              <div
                v-if="!activeIngredientNutritionReviewDraft.available"
                class="rounded-xl border border-dashed border-default p-5 text-sm text-muted"
              >
                {{ activeIngredientNutritionReviewDraft.message }}
              </div>

              <template v-else>
                <div class="rounded-xl border border-default/70 bg-elevated/20 p-4 sm:p-5">
                  <div class="grid gap-4 sm:grid-cols-3">
                    <UFormField
                      label="Resultado encontrado"
                      class="sm:col-span-2"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        :model-value="activeIngredientNutritionReviewDraft.matchedName"
                        class="w-full"
                        readonly
                      />
                    </UFormField>

                    <UFormField
                      label="Fuente"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        :model-value="activeIngredientNutritionReviewDraft.source"
                        class="w-full"
                        readonly
                      />
                    </UFormField>

                    <UFormField
                      label="Confianza"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        :model-value="activeIngredientNutritionConfidence"
                        class="w-full"
                        readonly
                      />
                    </UFormField>

                    <UFormField
                      label="Base nutricional"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <USelect
                        v-model="activeIngredientNutritionBasis"
                        :items="nutritionBasisOptions"
                        label-key="label"
                        value-key="value"
                        class="w-full"
                      />
                    </UFormField>

                    <UFormField
                      label="Tamaño base"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <UInput
                        v-model.number="activeIngredientNutritionReviewDraft.supplyDefaultServingSize"
                        class="w-full"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                      />
                    </UFormField>

                    <UFormField
                      label="Unidad base"
                      :ui="{ label: 'font-semibold text-highlighted' }"
                    >
                      <USelect
                        v-model="activeIngredientServingUnit"
                        :items="unitOptions"
                        label-key="label"
                        value-key="value"
                        class="w-full"
                      />
                    </UFormField>
                  </div>
                </div>

                <div class="rounded-xl border border-default/70 bg-elevated/20 p-4 sm:p-5">
                  <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <UFormField label="Calorías" :ui="{ label: 'font-semibold text-highlighted' }">
                      <UInput v-model.number="activeIngredientNutritionReviewDraft.supplyCalorias" class="w-full" type="number" min="0" step="0.01" placeholder="0" />
                    </UFormField>
                    <UFormField label="Proteína" :ui="{ label: 'font-semibold text-highlighted' }">
                      <UInput v-model.number="activeIngredientNutritionReviewDraft.supplyProteina" class="w-full" type="number" min="0" step="0.01" placeholder="0" />
                    </UFormField>
                    <UFormField label="Carbohidratos" :ui="{ label: 'font-semibold text-highlighted' }">
                      <UInput v-model.number="activeIngredientNutritionReviewDraft.supplyCarbohidratos" class="w-full" type="number" min="0" step="0.01" placeholder="0" />
                    </UFormField>
                    <UFormField label="Grasas" :ui="{ label: 'font-semibold text-highlighted' }">
                      <UInput v-model.number="activeIngredientNutritionReviewDraft.supplyGrasas" class="w-full" type="number" min="0" step="0.01" placeholder="0" />
                    </UFormField>
                    <UFormField label="Fibra" :ui="{ label: 'font-semibold text-highlighted' }">
                      <UInput v-model.number="activeIngredientNutritionReviewDraft.supplyFibra" class="w-full" type="number" min="0" step="0.01" placeholder="0" />
                    </UFormField>
                    <UFormField label="Azúcar" :ui="{ label: 'font-semibold text-highlighted' }">
                      <UInput v-model.number="activeIngredientNutritionReviewDraft.supplyAzucar" class="w-full" type="number" min="0" step="0.01" placeholder="0" />
                    </UFormField>
                    <UFormField label="Sodio" :ui="{ label: 'font-semibold text-highlighted' }">
                      <UInput v-model.number="activeIngredientNutritionReviewDraft.supplySodio" class="w-full" type="number" min="0" step="0.01" placeholder="0" />
                    </UFormField>
                    <UFormField label="Densidad" :ui="{ label: 'font-semibold text-highlighted' }">
                      <UInput v-model.number="activeIngredientNutritionReviewDraft.supplyDensidad" class="w-full" type="number" min="0" step="0.0001" placeholder="0" />
                    </UFormField>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </UTabs>
      </template>

      <template #footer>
        <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            @click="closeIngredientNutritionReview"
          >
            Cancelar
          </UButton>
          <UButton
            color="primary"
            icon="i-lucide-check"
            class="cursor-pointer"
            :disabled="!activeIngredientNutritionReviewDraft.available"
            @click="applyReviewedIngredientNutrition"
          >
            Usar estos datos
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="ingredientDeleteConfirmOpen"
      title="Quitar insumo"
      description="Este insumo se eliminará de la receta actual. ¿Quieres continuar?"
      :ui="{ content: 'max-w-md' }"
    >
      <template #footer>
        <div class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <UButton
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            @click="cancelRemoveEditingIngredient"
          >
            Cancelar
          </UButton>
          <UButton
            color="error"
            icon="i-lucide-trash-2"
            class="cursor-pointer"
            @click="removeEditingIngredient"
          >
            Quitar insumo
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="recipeDocumentModalOpen"
      :title="recipeDocumentConfig.title"
      :description="recipeDocumentConfig.description"
      :ui="{ content: 'max-w-4xl' }"
    >
      <template #body>
        <div class="space-y-4">
          <div class="rounded-xl border border-default bg-default p-4 sm:p-5">
            <div class="mb-3 flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="size-4 text-primary" />
              <p class="text-sm font-semibold text-highlighted">
                {{ recipeDocumentConfig.label }}
              </p>
            </div>

            <UTextarea
              v-model="activeRecipeDocumentValue"
              class="w-full"
              :rows="16"
              autoresize
              :placeholder="recipeDocumentConfig.placeholder"
              :ui="{
                base: 'rounded-none border-0 bg-transparent px-0 py-0 ring-0 focus-visible:ring-0',
              }"
            />
          </div>
        </div>
      </template>

      <template #footer>
        <div
          class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <UButton
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            @click="recipeDocumentModalOpen = false"
          >
            Cerrar
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="zeroCaloriesModalOpen"
      title="Advertencia"
      :ui="{ content: 'max-w-lg' }"
    >
      <template #description>
        <span class="text-sm text-muted">
          Este platillo se va a guardar con
          <strong class="font-semibold text-highlighted">0 calorías</strong>
          y ese valor se mostrará también en el menú público.
        </span>
      </template>

      <template #body>
        <UAlert
          color="warning"
          variant="soft"
          icon="i-lucide-triangle-alert"
          title="Confirma antes de continuar"
          description="Si este valor es correcto puedes continuar. Si no, vuelve a editar el platillo antes de guardarlo."
        />
      </template>

      <template #footer>
        <div
          class="flex w-full flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <UButton
            color="neutral"
            variant="ghost"
            class="cursor-pointer"
            @click="zeroCaloriesModalOpen = false"
          >
            Seguir editando
          </UButton>
          <UButton
            color="warning"
            icon="i-lucide-save"
            class="cursor-pointer"
            :loading="isSubmitting"
            @click="confirmZeroCaloriesSave"
          >
            {{ isSubmitting ? 'Guardando...' : 'Continuar y guardar' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </UForm>
</template>
