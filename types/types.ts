export const DAY_OF_WEEK_VALUES = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO'
] as const

export const SLOT_KEYS = ['desayuno', 'comida', 'cena', 'snack1', 'snack2'] as const
export const RECIPE_STATUS_VALUES = ['BORRADOR', 'ACTIVA', 'ARCHIVADA'] as const
export const MEASUREMENT_UNIT_VALUES = [
  'GRAMO',
  'KILOGRAMO',
  'MILILITRO',
  'LITRO',
  'PIEZA',
  'TAZA',
  'CUCHARADA',
  'CUCHARADITA',
  'ONZA',
  'LIBRA',
  'PAQUETE',
  'LATA',
  'BOTELLA',
  'PORCION'
] as const

export type DayOfWeek = (typeof DAY_OF_WEEK_VALUES)[number]
export type SlotKey = (typeof SLOT_KEYS)[number]
export type RecipeStatus = (typeof RECIPE_STATUS_VALUES)[number]
export type MeasurementUnit = (typeof MEASUREMENT_UNIT_VALUES)[number]

export interface WeeklyPlan {
  id: number
  title: string
  price: number
  description: string
  image: string
  variants: {
    title: string
    price: string
  }[]
  button: {
    label: string
    icon: string
  }
}

export interface FoodItemDetail {
  catalogItemId?: string | null
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
}

export interface SupplyCategorySummary {
  id: string
  createdAt: string
  updatedAt: string
  nombre: string
  slug: string
  descripcion: string
  isActive: boolean
  sortOrder: number
}

export interface SupplyCategoryInput {
  nombre: string
  descripcion: string
  isActive: boolean
  sortOrder: number
}

export interface SupplyItemSummary {
  id: string
  createdAt: string
  updatedAt: string
  nombre: string
  descripcion: string
  codigo: string | null
  unidadBase: MeasurementUnit
  nutritionBasis?: 'POR_100_GRAMOS' | 'POR_100_MILILITROS' | 'POR_PORCION' | 'POR_UNIDAD' | null
  defaultServingSize?: number | null
  defaultServingUnit?: MeasurementUnit | null
  densidad?: number | null
  calorias?: number | null
  proteina?: number | null
  carbohidratos?: number | null
  grasas?: number | null
  fibra?: number | null
  azucar?: number | null
  sodio?: number | null
  tags: string[]
  isActive: boolean
  costoReferencial: number | null
  mermaPorcentaje: number | null
  category: SupplyCategorySummary | null
}

export interface SupplyItemInput {
  nombre: string
  descripcion: string
  codigo?: string | null
  unidadBase: MeasurementUnit
  tags: string[]
  isActive: boolean
  costoReferencial?: number | null
  mermaPorcentaje?: number | null
  categoryId?: string | null
}

export interface RecipeIngredient {
  id: string
  orden: number
  grupo: string | null
  cantidad: number
  unidad: MeasurementUnit
  notas: string
  opcional: boolean
  supplyItem: SupplyItemSummary
}

export interface RecipeDetail {
  id: string
  status: RecipeStatus
  version: number
  porciones: number | null
  rendimientoCantidad: number | null
  rendimientoUnidad: MeasurementUnit | null
  tiempoPreparacionMin: number | null
  tiempoCoccionMin: number | null
  instrucciones: string
  notas: string
  ingredients: RecipeIngredient[]
}

export interface RecipeIngredientInput {
  supplyName: string
  supplyDescription: string
  supplyCode?: string | null
  supplyUnitBase: MeasurementUnit
  supplyCategoryName?: string | null
  supplyTags: string[]
  supplyCostoReferencial?: number | null
  supplyMermaPorcentaje?: number | null
  supplyCalorias?: number | null
  supplyProteina?: number | null
  supplyCarbohidratos?: number | null
  supplyGrasas?: number | null
  supplyFibra?: number | null
  supplyAzucar?: number | null
  supplySodio?: number | null
  supplyNutritionBasis?: 'POR_100_GRAMOS' | 'POR_100_MILILITROS' | 'POR_PORCION' | 'POR_UNIDAD' | null
  supplyDefaultServingSize?: number | null
  supplyDefaultServingUnit?: MeasurementUnit | null
  supplyDensidad?: number | null
  grupo?: string | null
  cantidad: number
  unidad: MeasurementUnit
  notas: string
  opcional: boolean
}

export interface RecipeInput {
  status?: RecipeStatus
  porciones?: number | null
  rendimientoCantidad?: number | null
  rendimientoUnidad?: MeasurementUnit | null
  tiempoPreparacionMin?: number | null
  tiempoCoccionMin?: number | null
  instrucciones: string
  notas: string
  ingredients: RecipeIngredientInput[]
}

export interface FoodCatalogItem extends Omit<FoodItemDetail, 'catalogItemId'> {
  id: string
  createdAt: string
  updatedAt: string
}

export interface LinkedMenuSummary {
  id: string
  name: string
}

export interface FoodCatalogItemDetail extends FoodCatalogItem {
  linkedMenus: LinkedMenuSummary[]
  recipe?: RecipeDetail | null
}

export interface FoodCatalogItemInput extends Omit<FoodItemDetail, 'catalogItemId'> {
  recipe?: RecipeInput | null
}

export interface MenuSlot {
  platilloPrincipal: FoodItemDetail
  guarnicion1?: FoodItemDetail | null
  guarnicion2?: FoodItemDetail | null
  contenedor?: string | null
  adicionales: FoodItemDetail[]
}

export interface DayMenu {
  dayOfWeek: DayOfWeek
  desayuno: MenuSlot
  comida: MenuSlot
  cena: MenuSlot
  snack1: MenuSlot
  snack2: MenuSlot
}

export interface WeeklyMenu {
  id: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  startDate: string
  endDate: string
  name: string
  days: DayMenu[]
}

export interface WeeklyMenuInput {
  name: string
  startDate: string | Date
  endDate: string | Date
  days: DayMenu[]
}
