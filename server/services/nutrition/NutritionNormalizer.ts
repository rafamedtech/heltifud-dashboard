import { DEFAULT_EDIBLE_PORTION_FACTOR, DEFAULT_NUTRITION_BASIS, HIGH_CONFIDENCE_THRESHOLD } from './constants'
import type {
  ExternalNutritionCandidate,
  NormalizedNutritionRecord,
} from './types'
import {
  clamp,
  computeNameSimilarity,
  computeNutritionCompleteness,
  computeNutritionConfidence,
  roundTo,
} from '~~/server/utils/nutrition/confidenceScore'
import { normalizeNutritionText } from '~~/server/utils/nutrition/normalizeText'
import {
  convertToGrams,
  convertToMilliliters,
  isUnitLike,
  measurementUnitFromString,
  resolveBasisFromMetric,
} from '~~/server/utils/nutrition/measurements'

export class NutritionNormalizer {
  normalizeCandidate(query: string, candidate: ExternalNutritionCandidate): NormalizedNutritionRecord {
    const normalizedQuery = this.normalizeName(query)
    const normalizedName = this.normalizeName(candidate.name)
    const providerScore = clamp(candidate.score ?? 0.5)
    const similarity = computeNameSimilarity(query, candidate.name)
    const completeness = computeNutritionCompleteness(candidate)
    const confidence = this.computeConfidence({
      providerScore,
      similarity,
      completeness,
      candidate,
      normalizedQuery,
      normalizedName,
    })

    const reviewReasons: string[] = []

    if (similarity < 0.8) {
      reviewReasons.push('Coincidencia de nombre no exacta.')
    }

    if (confidence < 0.84) {
      reviewReasons.push('Confianza menor al umbral automático.')
    }

    if (candidate.metrics.calories === null) {
      reviewReasons.push('Respuesta externa sin calorías.')
    }

    if (completeness < 0.45) {
      reviewReasons.push('La respuesta externa viene incompleta.')
    }

    const defaultServingSize = this.normalizeNumber(candidate.metrics.defaultServingSize)
    const defaultServingUnit = candidate.metrics.defaultServingUnit
    const servingAmount = this.normalizeNumber(
      candidate.serving?.metricAmount
      ?? candidate.serving?.amount
      ?? candidate.metrics.defaultServingSize,
    )
    const servingUnit = measurementUnitFromString(candidate.serving?.metricUnit)
      ?? measurementUnitFromString(candidate.serving?.unit)
      ?? defaultServingUnit
    const canonical = this.standardizeToCanonicalBasis({
      candidate,
      servingAmount,
      servingUnit,
      defaultServingSize,
      defaultServingUnit,
    })

    if (canonical.wasStandardized) {
      reviewReasons.push(`Valores normalizados a base ${this.formatBasisLabel(canonical.nutritionBasis)}.`)
    }

    return {
      query: query.trim(),
      name: candidate.name.trim(),
      matchedName: candidate.name.trim(),
      normalizedName,
      nutritionBasis: canonical.nutritionBasis,
      servingAmount: canonical.servingAmount,
      servingUnit: canonical.servingUnit,
      calories: canonical.calories,
      protein: canonical.protein,
      carbs: canonical.carbs,
      fat: canonical.fat,
      fiber: canonical.fiber,
      sugar: canonical.sugar,
      sodium: canonical.sodium,
      defaultServingSize: canonical.defaultServingSize,
      defaultServingUnit: canonical.defaultServingUnit,
      density: this.normalizeNumber(candidate.metrics.density),
      ediblePortionFactor: this.normalizeNumber(
        candidate.metrics.ediblePortionFactor ?? DEFAULT_EDIBLE_PORTION_FACTOR,
      ),
      source: candidate.source,
      sourceExternalId: candidate.externalId ?? null,
      sourceQuery: query.trim(),
      sourceConfidence: confidence,
      needsReview: confidence < HIGH_CONFIDENCE_THRESHOLD || reviewReasons.length > 0,
      sourceSnapshot: {
        source: candidate.source,
        providerScore,
        similarity,
        completeness,
        canonicalBasis: canonical.nutritionBasis,
        candidate,
      },
      reviewReasons,
    }
  }

  normalizeName(value: string) {
    return normalizeNutritionText(value)
  }

  private standardizeToCanonicalBasis(input: {
    candidate: ExternalNutritionCandidate
    servingAmount: number | null
    servingUnit: ReturnType<typeof measurementUnitFromString>
    defaultServingSize: number | null
    defaultServingUnit: ExternalNutritionCandidate['metrics']['defaultServingUnit']
  }) {
    const rawMetrics = {
      calories: this.normalizeNumber(input.candidate.metrics.calories),
      protein: this.normalizeNumber(input.candidate.metrics.protein),
      carbs: this.normalizeNumber(input.candidate.metrics.carbs),
      fat: this.normalizeNumber(input.candidate.metrics.fat),
      fiber: this.normalizeNumber(input.candidate.metrics.fiber),
      sugar: this.normalizeNumber(input.candidate.metrics.sugar),
      sodium: this.normalizeNumber(input.candidate.metrics.sodium),
    }

    const basisAmount = this.normalizeNumber(
      input.candidate.metrics.basisAmount
      ?? input.defaultServingSize
      ?? input.servingAmount,
    )
    const basisUnit = measurementUnitFromString(input.candidate.metrics.basisUnit)
      ?? input.defaultServingUnit
      ?? input.servingUnit
    const resolvedBasis = resolveBasisFromMetric(basisAmount, basisUnit)
      ?? DEFAULT_NUTRITION_BASIS

    if (basisAmount && basisUnit) {
      const grams = convertToGrams(basisAmount, basisUnit)

      if (grams && grams > 0) {
        return {
          ...this.scaleMetrics(rawMetrics, 100 / grams),
          nutritionBasis: 'POR_100_GRAMOS' as const,
          servingAmount: 100,
          servingUnit: 'GRAMO' as const,
          defaultServingSize: 100,
          defaultServingUnit: 'GRAMO' as const,
          wasStandardized: resolvedBasis !== 'POR_100_GRAMOS' || Math.abs(grams - 100) > 0.0001,
        }
      }

      const milliliters = convertToMilliliters(basisAmount, basisUnit)

      if (milliliters && milliliters > 0) {
        return {
          ...this.scaleMetrics(rawMetrics, 100 / milliliters),
          nutritionBasis: 'POR_100_MILILITROS' as const,
          servingAmount: 100,
          servingUnit: 'MILILITRO' as const,
          defaultServingSize: 100,
          defaultServingUnit: 'MILILITRO' as const,
          wasStandardized: resolvedBasis !== 'POR_100_MILILITROS' || Math.abs(milliliters - 100) > 0.0001,
        }
      }

      if (isUnitLike(basisUnit)) {
        return {
          ...this.scaleMetrics(rawMetrics, 1 / basisAmount),
          nutritionBasis: 'POR_UNIDAD' as const,
          servingAmount: 1,
          servingUnit: 'PIEZA' as const,
          defaultServingSize: 1,
          defaultServingUnit: 'PIEZA' as const,
          wasStandardized: resolvedBasis !== 'POR_UNIDAD' || Math.abs(basisAmount - 1) > 0.0001,
        }
      }
    }

    return {
      ...rawMetrics,
      nutritionBasis: resolvedBasis,
      servingAmount: input.servingAmount,
      servingUnit: input.servingUnit,
      defaultServingSize: input.defaultServingSize,
      defaultServingUnit: input.defaultServingUnit,
      wasStandardized: false,
    }
  }

  private scaleMetrics(
    metrics: {
      calories: number | null
      protein: number | null
      carbs: number | null
      fat: number | null
      fiber: number | null
      sugar: number | null
      sodium: number | null
    },
    factor: number,
  ) {
    return {
      calories: this.scaleMetric(metrics.calories, factor),
      protein: this.scaleMetric(metrics.protein, factor),
      carbs: this.scaleMetric(metrics.carbs, factor),
      fat: this.scaleMetric(metrics.fat, factor),
      fiber: this.scaleMetric(metrics.fiber, factor),
      sugar: this.scaleMetric(metrics.sugar, factor),
      sodium: this.scaleMetric(metrics.sodium, factor),
    }
  }

  private scaleMetric(value: number | null, factor: number) {
    if (value === null || Number.isNaN(factor)) {
      return null
    }

    return roundTo(value * factor, 4)
  }

  private normalizeNumber(value: number | null | undefined) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null
    }

    return roundTo(value, 4)
  }

  private computeConfidence(input: {
    providerScore: number
    similarity: number
    completeness: number
    candidate: ExternalNutritionCandidate
    normalizedQuery: string
    normalizedName: string
  }) {
    return computeNutritionConfidence({
      providerScore: input.providerScore,
      similarity: input.similarity,
      completeness: input.completeness,
      source: input.candidate.source,
      candidate: input.candidate,
      normalizedQuery: input.normalizedQuery,
      normalizedName: input.normalizedName,
    })
  }

  private formatBasisLabel(
    basis: 'POR_100_GRAMOS' | 'POR_100_MILILITROS' | 'POR_PORCION' | 'POR_UNIDAD',
  ) {
    if (basis === 'POR_100_GRAMOS') return 'por 100 gramos'
    if (basis === 'POR_100_MILILITROS') return 'por 100 mililitros'
    if (basis === 'POR_UNIDAD') return 'por 1 pieza'
    return 'por porción'
  }
}
