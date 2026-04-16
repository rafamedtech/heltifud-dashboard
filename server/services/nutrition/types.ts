import type { Prisma } from '~~/prisma/generated/client/client'
import type {
  MeasurementUnit,
  NutritionBasis,
  NutritionLookupOutcome,
  NutritionSource,
  SupplyItemStatus,
} from '~~/prisma/generated/client/enums'

export type NullableNumber = number | null

export interface NutritionMacroPayload {
  calories: NullableNumber
  protein: NullableNumber
  carbs: NullableNumber
  fat: NullableNumber
  fiber: NullableNumber
  sugar: NullableNumber
  sodium: NullableNumber
}

export interface ExternalNutritionServing {
  amount: NullableNumber
  unit: string | null
  metricAmount: NullableNumber
  metricUnit: string | null
}

export interface ExternalNutritionMetrics extends NutritionMacroPayload {
  basisAmount: NullableNumber
  basisUnit: string | null
  defaultServingSize: NullableNumber
  defaultServingUnit: MeasurementUnit | null
  density: NullableNumber
  ediblePortionFactor: NullableNumber
}

export interface ExternalNutritionCandidate {
  source: NutritionSource
  externalId: string
  name: string
  brandName?: string | null
  description?: string | null
  score?: NullableNumber
  serving?: ExternalNutritionServing | null
  metrics: ExternalNutritionMetrics
  raw: unknown
}

export interface ProviderSearchParams {
  query: string
  maxResults?: number
}

export interface ProviderSearchResult {
  source: NutritionSource
  query: string
  normalizedQuery: string
  candidates: ExternalNutritionCandidate[]
  requestSnapshot?: Prisma.InputJsonValue | null
  responseSnapshot?: Prisma.InputJsonValue | null
}

export interface NutritionProvider {
  readonly source: NutritionSource
  isConfigured(): boolean
  search(params: ProviderSearchParams): Promise<ProviderSearchResult>
}

export interface NormalizedNutritionRecord extends NutritionMacroPayload {
  query: string
  name: string
  matchedName: string
  normalizedName: string
  nutritionBasis: NutritionBasis
  servingAmount: NullableNumber
  servingUnit: MeasurementUnit | null
  defaultServingSize: NullableNumber
  defaultServingUnit: MeasurementUnit | null
  density: NullableNumber
  ediblePortionFactor: NullableNumber
  source: NutritionSource
  sourceExternalId: string | null
  sourceQuery: string
  sourceConfidence: number
  needsReview: boolean
  sourceSnapshot: Prisma.InputJsonValue
  reviewReasons: string[]
}

export interface NutritionLookupInput {
  supplyItemId?: string
  name: string
  description?: string
  codigo?: string | null
  barcode?: string | null
  unidadBase?: MeasurementUnit
  categoryId?: string | null
  status?: SupplyItemStatus
  force?: boolean
}

export interface NutritionLookupCandidateEvaluation {
  providerResult: ProviderSearchResult
  candidate: ExternalNutritionCandidate
  normalized: NormalizedNutritionRecord
}

export interface NutritionLookupProviderMatch {
  source: NutritionSource
  matched: boolean
  needsReview: boolean
  confidence: number | null
  normalized: NormalizedNutritionRecord | null
  message: string
}

export interface NutritionLookupResult {
  supplyItemId: string | null
  outcome: 'matched' | 'needs_review' | 'manual_required'
  matched: boolean
  needsReview: boolean
  source: NutritionSource | null
  confidence: number | null
  normalized: NormalizedNutritionRecord | null
  providerMatches: NutritionLookupProviderMatch[]
  providersTried: NutritionSource[]
  logsCreated: number
  message: string
}

export interface LookupLogPayload {
  source: NutritionSource
  sourceExternalId?: string | null
  query: string
  normalizedQuery: string
  confidence?: number | null
  outcome: NutritionLookupOutcome
  requestSnapshot?: Prisma.InputJsonValue | null
  responseSnapshot?: Prisma.InputJsonValue | null
  selectedSnapshot?: Prisma.InputJsonValue | null
  errorMessage?: string | null
  accepted?: boolean | null
}

export interface RecipeNutritionComputationResult extends NutritionMacroPayload {
  recipeId: string
  ingredientsProcessed: number
  ingredientsResolved: number
  ingredientsSkipped: number
  estimatedCost: NullableNumber
  totalWeightGrams: NullableNumber
  nutritionCalculatedAt: string
}
