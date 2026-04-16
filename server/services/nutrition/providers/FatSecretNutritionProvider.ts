import { Buffer } from 'node:buffer'
import { NutritionSource } from '~~/prisma/generated/client/enums'
import {
  FATSECRET_API_URL,
  FATSECRET_METHODS,
  FATSECRET_SEARCH_PAGE_SIZE,
  FATSECRET_TOKEN_URL,
} from '../constants'
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

type FatSecretTokenResponse = {
  access_token: string
  expires_in: number
  token_type: string
}

export class FatSecretNutritionProvider implements NutritionProvider {
  readonly source = NutritionSource.FATSECRET

  private cachedToken: { value: string, expiresAt: number } | null = null

  constructor(
    private readonly clientId = process.env.FATSECRET_CLIENT_ID,
    private readonly clientSecret = process.env.FATSECRET_CLIENT_SECRET,
    private readonly tokenUrl = process.env.FATSECRET_TOKEN_URL ?? FATSECRET_TOKEN_URL,
    private readonly apiUrl = process.env.FATSECRET_API_URL ?? FATSECRET_API_URL,
    private readonly oauthScope = process.env.FATSECRET_SCOPE,
  ) {}

  isConfigured() {
    return Boolean(this.clientId && this.clientSecret)
  }

  async search(params: ProviderSearchParams): Promise<ProviderSearchResult> {
    if (!this.isConfigured()) {
      throw new Error('Credenciales de FatSecret no configuradas.')
    }

    const accessToken = await this.getAccessToken()
    const query = params.query.trim()
    const requestParams = new URLSearchParams({
      method: FATSECRET_METHODS.search,
      search_expression: query,
      max_results: String(params.maxResults ?? FATSECRET_SEARCH_PAGE_SIZE),
      flag_default_serving: 'true',
      format: 'json',
    })

    const data = await fetchJson<Record<string, any>>({
      provider: 'FatSecret',
      url: `${this.apiUrl}?${requestParams.toString()}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })
    this.assertNoApiError(data)
    const foods = this.extractFoods(data)

    const candidates = await Promise.all(
      foods.slice(0, params.maxResults ?? FATSECRET_SEARCH_PAGE_SIZE).map((food) =>
        this.mapSearchFoodToCandidate(food, accessToken).catch(() => null),
      ),
    )

    return {
      source: this.source,
      query,
      normalizedQuery: normalizeNutritionText(query),
      candidates: candidates.filter(Boolean) as ExternalNutritionCandidate[],
      requestSnapshot: Object.fromEntries(requestParams.entries()),
      responseSnapshot: data,
    }
  }

  private async mapSearchFoodToCandidate(food: Record<string, any>, accessToken: string) {
    const externalId = String(food.food_id ?? food.id)
    const details = await this.fetchFoodDetails(externalId, accessToken)
    const serving = this.pickServing(details ?? food)
    const metrics = this.extractMetrics(serving)
    const candidateName = String(food.food_name ?? details?.food_name ?? '').trim()

    if (!candidateName) {
      return null
    }

    return {
      source: this.source,
      externalId,
      name: candidateName,
      brandName: String(food.brand_name ?? details?.brand_name ?? '').trim() || null,
      description: String(food.food_description ?? '').trim() || null,
      score: this.estimateScore(food),
      serving: {
        amount: this.toNumber(serving?.number_of_units),
        unit: String(serving?.measurement_description ?? '').trim() || null,
        metricAmount: this.toNumber(serving?.metric_serving_amount),
        metricUnit: String(serving?.metric_serving_unit ?? '').trim() || null,
      },
      metrics,
      raw: {
        search: food,
        details,
        serving,
      },
    } satisfies ExternalNutritionCandidate
  }

  private async fetchFoodDetails(foodId: string, accessToken: string) {
    const params = new URLSearchParams({
      method: FATSECRET_METHODS.get,
      food_id: foodId,
      format: 'json',
    })

    try {
      const data = await fetchJson<Record<string, any>>({
        provider: 'FatSecret',
        url: `${this.apiUrl}?${params.toString()}`,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      })
      this.assertNoApiError(data)

      return data.food ?? data
    } catch {
      return null
    }
  }

  private pickServing(details: Record<string, any> | null) {
    const servings = details?.servings?.serving

    if (!servings) {
      return null
    }

    const list = Array.isArray(servings) ? servings : [servings]

    const defaultServing = list.find(
      (serving: Record<string, any>) => Number(serving.is_default) === 1,
    )

    if (defaultServing) {
      return defaultServing
    }

    return list.find((serving: Record<string, any>) => {
      const amount = this.toNumber(serving.metric_serving_amount)
      const unit = String(serving.metric_serving_unit ?? '').trim().toLowerCase()
      return amount === 100 && ['g', 'gram', 'grams', 'ml', 'milliliter', 'milliliters'].includes(unit)
    }) ?? list[0]
  }

  private extractFoods(data: Record<string, any>) {
    const foods = data.foods_search?.results?.food
      ?? data.foods?.food
      ?? data.results?.food
      ?? []
    return Array.isArray(foods) ? foods : [foods]
  }

  private extractMetrics(serving: Record<string, any> | null): ExternalNutritionMetrics {
    const metricAmount = this.toNumber(serving?.metric_serving_amount)
    const metricUnitRaw = String(serving?.metric_serving_unit ?? '').trim() || null
    const metricUnit = measurementUnitFromString(metricUnitRaw)

    return {
      calories: this.toNumber(serving?.calories),
      protein: this.toNumber(serving?.protein),
      carbs: this.toNumber(serving?.carbohydrate),
      fat: this.toNumber(serving?.fat),
      fiber: this.toNumber(serving?.fiber),
      sugar: this.toNumber(serving?.sugar),
      sodium: this.toNumber(serving?.sodium),
      basisAmount: metricAmount ?? this.toNumber(serving?.number_of_units),
      basisUnit: metricUnitRaw ?? serving?.measurement_description ?? null,
      defaultServingSize: metricAmount,
      defaultServingUnit: metricUnit,
      density: null,
      ediblePortionFactor: null,
    }
  }

  private estimateScore(food: Record<string, any>) {
    const description = String(food.food_description ?? '').toLocaleLowerCase('es-MX')

    if (description.includes('per 100g') || description.includes('per 100 g')) {
      return 0.88
    }

    if (description.includes('calories')) {
      return 0.76
    }

    return 0.68
  }

  private assertNoApiError(data: Record<string, any>) {
    if (!data?.error) {
      return
    }

    const code = data.error.code != null ? ` (${data.error.code})` : ''
    const message = String(data.error.message ?? 'Error desconocido de FatSecret')
    throw new Error(`FatSecret${code}: ${message}`)
  }

  private async getAccessToken() {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.value
    }

    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
    })

    if (this.oauthScope?.trim()) {
      body.set('scope', this.oauthScope.trim())
    }

    const payload = await fetchJson<FatSecretTokenResponse>({
      provider: 'FatSecret',
      url: this.tokenUrl,
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    this.cachedToken = {
      value: payload.access_token,
      expiresAt: Date.now() + Math.max(0, payload.expires_in - 60) * 1000,
    }

    return payload.access_token
  }

  private toNumber(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return null
    }

    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
}
