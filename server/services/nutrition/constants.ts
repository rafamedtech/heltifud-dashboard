import { NutritionBasis, NutritionSource } from '~~/prisma/generated/client/enums'

export const USDA_DEFAULT_BASE_URL = 'https://api.nal.usda.gov/fdc/v1'
export const FATSECRET_TOKEN_URL = 'https://oauth.fatsecret.com/connect/token'
export const FATSECRET_API_URL = 'https://platform.fatsecret.com/rest/server.api'

export const USDA_SEARCH_PAGE_SIZE = 5
export const FATSECRET_SEARCH_PAGE_SIZE = 5

export const HIGH_CONFIDENCE_THRESHOLD = 0.84
export const REVIEW_THRESHOLD = 0.62

export const DEFAULT_EDIBLE_PORTION_FACTOR = 1
export const DEFAULT_NUTRITION_BASIS = NutritionBasis.POR_100_GRAMOS
export const PROVIDER_PRIORITY: NutritionSource[] = [
  NutritionSource.USDA,
  NutritionSource.FATSECRET,
]

export const USDA_NUTRIENT_IDS = {
  calories: [1008],
  protein: [1003],
  carbs: [1005],
  fat: [1004],
  fiber: [1079],
  sugar: [2000],
  sodium: [1093],
} as const

export const FATSECRET_METHODS = {
  search: 'foods.search.v3',
  get: 'food.get.v4',
} as const

export const MASS_UNITS_IN_GRAMS = {
  GRAMO: 1,
  KILOGRAMO: 1000,
  ONZA: 28.349523125,
  LIBRA: 453.59237,
} as const

export const VOLUME_UNITS_IN_MILLILITERS = {
  MILILITRO: 1,
  LITRO: 1000,
  TAZA: 240,
  CUCHARADA: 15,
  CUCHARADITA: 5,
  BOTELLA: 1000,
  LATA: 355,
} as const

export const UNIT_LIKE_MEASUREMENT_UNITS = new Set([
  'PIEZA',
  'PORCION',
  'PAQUETE',
  'LATA',
  'BOTELLA',
] as const)
