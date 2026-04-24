import { NutritionSource } from '~~/prisma/generated/client/enums'
import type { Prisma } from '~~/prisma/generated/client/client'
import { USDA_DEFAULT_BASE_URL, USDA_NUTRIENT_IDS, USDA_SEARCH_PAGE_SIZE } from '../constants'
import type {
  ExternalNutritionCandidate,
  ExternalNutritionMetrics,
  NutritionProvider,
  ProviderSearchParams,
  ProviderSearchResult,
} from '../types'
import { normalizeNutritionText } from '~~/server/utils/nutrition/normalizeText'
import { measurementUnitFromString } from '~~/server/utils/nutrition/measurements'
import { fetchJson } from '~~/server/utils/nutrition/http'

type UsdaSearchResponse = {
  foods?: Array<Record<string, any>>
  totalHits?: number
}

export class UsdaNutritionProvider implements NutritionProvider {
  readonly source = NutritionSource.USDA

  constructor(
    private readonly apiKey = process.env.USDA_FDC_API_KEY,
    private readonly baseUrl = process.env.USDA_FDC_BASE_URL ?? USDA_DEFAULT_BASE_URL,
  ) {}

  isConfigured() {
    return Boolean(this.apiKey)
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.apiKey) {
      throw new Error('USDA_FDC_API_KEY no está configurado.')
    }

    const query = params.query.trim()
    const queryVariants = this.buildQueryVariants(query)
    const pageSize = params.maxResults ?? USDA_SEARCH_PAGE_SIZE
    const requestSnapshots: Array<Record<string, unknown>> = []
    const collectedFoods: Array<Record<string, any>> = []

    for (const variant of queryVariants) {
      const unbrandedBody = {
        query: variant,
        pageSize,
        dataType: ['Foundation', 'SR Legacy', 'Survey (FNDDS)'],
      }

      requestSnapshots.push(unbrandedBody)

      const unbrandedData = await fetchJson<UsdaSearchResponse>({
        provider: 'USDA',
        url: `${this.baseUrl}/foods/search?api_key=${encodeURIComponent(this.apiKey)}`,
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(unbrandedBody),
      })

      const unbrandedFoods = unbrandedData.foods ?? []
      if (unbrandedFoods.length) {
        collectedFoods.push(...unbrandedFoods)
      }
    }

    if (!collectedFoods.length) {
      for (const variant of queryVariants) {
        const brandedBody = {
          query: variant,
          pageSize,
          dataType: ['Branded'],
        }

        requestSnapshots.push(brandedBody)

        const brandedData = await fetchJson<UsdaSearchResponse>({
          provider: 'USDA',
          url: `${this.baseUrl}/foods/search?api_key=${encodeURIComponent(this.apiKey)}`,
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(brandedBody),
        })

        const brandedFoods = brandedData.foods ?? []
        if (brandedFoods.length) {
          collectedFoods.push(...brandedFoods)
        }
      }
    }

    const topFoods = this.dedupeFoods(collectedFoods).slice(0, pageSize)
    const candidates = await Promise.all(
      topFoods.map(food => this.mapSearchFoodToCandidate(food).catch(() => null)),
    )

    return {
      source: this.source,
      query,
      normalizedQuery: normalizeNutritionText(query),
      candidates: candidates.filter(Boolean) as ExternalNutritionCandidate[],
      requestSnapshot: requestSnapshots as Prisma.InputJsonValue,
      responseSnapshot: {
        foods: topFoods,
      } as Prisma.InputJsonValue,
    }
  }

  private buildQueryVariants(query: string) {
    const variants = [query.trim()]
    const aliasMap: Record<string, string> = {
      tomate: 'tomatoes raw',
      cebolla: 'onions raw',
      ajo: 'garlic raw',
      pollo: 'chicken',
      res: 'beef',
      cerdo: 'pork',
      arroz: 'rice cooked',
      frijol: 'beans cooked',
      frijoles: 'beans cooked',
      zanahoria: 'carrots raw',
      papa: 'potatoes raw',
      lechuga: 'lettuce raw',
    }

    const normalized = normalizeNutritionText(query)
    const alias = aliasMap[normalized]

    if (alias && !variants.includes(alias)) {
      variants.push(alias)
    }

    return variants
  }

  private dedupeFoods(foods: Array<Record<string, any>>) {
    const seen = new Set<string>()

    return foods.filter((food) => {
      const key = String(food.fdcId ?? '')
      if (!key || seen.has(key)) {
        return false
      }

      seen.add(key)
      return true
    })
  }

  private async mapSearchFoodToCandidate(food: Record<string, any>) {
    const details = await this.fetchFoodDetails(String(food.fdcId))
    const metrics = this.extractMetrics(details ?? food)
    const candidateName = String(food.description ?? details?.description ?? '').trim()

    if (!candidateName) {
      return null
    }

    return {
      source: this.source,
      externalId: String(food.fdcId),
      name: candidateName,
      brandName: String(food.brandOwner ?? details?.brandOwner ?? '').trim() || null,
      description: this.buildDescription(food, details),
      score: this.normalizeScore(food.score),
      serving: {
        amount: this.toNumber(details?.servingSize ?? food.servingSize),
        unit: String(details?.servingSizeUnit ?? food.servingSizeUnit ?? '').trim() || null,
        metricAmount: this.toNumber(details?.servingSize ?? food.servingSize),
        metricUnit: String(details?.servingSizeUnit ?? food.servingSizeUnit ?? '').trim() || null,
      },
      metrics,
      raw: details ?? food,
    } satisfies ExternalNutritionCandidate
  }

  private async fetchFoodDetails(fdcId: string) {
    try {
      return await fetchJson<Record<string, any>>({
        provider: 'USDA',
        url: `${this.baseUrl}/food/${encodeURIComponent(fdcId)}?api_key=${encodeURIComponent(this.apiKey!)}`,
        headers: {
          accept: 'application/json',
        },
      })
    } catch {
      return null
    }
  }

  private buildDescription(food: Record<string, any>, details: Record<string, any> | null) {
    const pieces = [
      String(food.dataType ?? details?.dataType ?? '').trim(),
      String(food.brandOwner ?? details?.brandOwner ?? '').trim(),
    ].filter(Boolean)

    return pieces.join(' · ') || null
  }

  private extractMetrics(food: Record<string, any>): ExternalNutritionMetrics {
    const nutrients = Array.isArray(food.foodNutrients) ? food.foodNutrients : []
    const servingSize = this.toNumber(food.servingSize)
    const servingUnitRaw = String(food.servingSizeUnit ?? '').trim() || null
    const servingUnit = measurementUnitFromString(servingUnitRaw)
    const dataType = String(food.dataType ?? '').trim().toLocaleLowerCase('es-MX')
    const isBranded = dataType.includes('branded')
    const basisAmount = isBranded && servingSize && servingUnit ? servingSize : 100
    const basisUnit = isBranded && servingSize && servingUnit
      ? servingUnitRaw
      : this.inferCanonicalBasisUnit(food)

    return {
      calories: this.findNutrientAmount(nutrients, USDA_NUTRIENT_IDS.calories),
      protein: this.findNutrientAmount(nutrients, USDA_NUTRIENT_IDS.protein),
      carbs: this.findNutrientAmount(nutrients, USDA_NUTRIENT_IDS.carbs),
      fat: this.findNutrientAmount(nutrients, USDA_NUTRIENT_IDS.fat),
      fiber: this.findNutrientAmount(nutrients, USDA_NUTRIENT_IDS.fiber),
      sugar: this.findNutrientAmount(nutrients, USDA_NUTRIENT_IDS.sugar),
      sodium: this.findNutrientAmount(nutrients, USDA_NUTRIENT_IDS.sodium),
      basisAmount,
      basisUnit,
      defaultServingSize: servingSize,
      defaultServingUnit: servingUnit,
      density: null,
      ediblePortionFactor: null,
    }
  }

  private inferCanonicalBasisUnit(food: Record<string, any>) {
    const description = String(food.description ?? '').toLocaleLowerCase('es-MX')
    const servingUnitRaw = String(food.servingSizeUnit ?? '').trim() || null
    const servingUnit = measurementUnitFromString(servingUnitRaw)

    if (servingUnit === 'MILILITRO' || servingUnit === 'LITRO') {
      return 'ml'
    }

    if (
      description.includes('juice')
      || description.includes('bebida')
      || description.includes('drink')
      || description.includes('milk')
      || description.includes('broth')
      || description.includes('caldo')
    ) {
      return 'ml'
    }

    return 'g'
  }

  private findNutrientAmount(
    nutrients: Array<Record<string, any>>,
    nutrientIds: readonly number[],
  ) {
    const nutrient = nutrients.find((entry) => {
      const id = Number(entry.nutrientId ?? entry.nutrient?.id)
      return nutrientIds.includes(id)
    })

    return this.toNumber(nutrient?.value ?? nutrient?.amount)
  }

  private normalizeScore(value: unknown) {
    const numeric = this.toNumber(value)

    if (numeric === null) {
      return 0.5
    }

    if (numeric > 1) {
      return Math.min(1, numeric / 100)
    }

    return Math.max(0, Math.min(1, numeric))
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
}
