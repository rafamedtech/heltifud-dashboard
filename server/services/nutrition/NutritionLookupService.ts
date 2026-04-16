import { Prisma } from '~~/prisma/generated/client/client'
import {
  MeasurementUnit,
  NutritionLookupOutcome,
  NutritionSource,
  SupplyItemStatus,
} from '~~/prisma/generated/client/enums'
import { prisma } from '~~/server/utils/prisma'
import {
  PROVIDER_PRIORITY,
  REVIEW_THRESHOLD,
} from './constants'
import { NutritionNormalizer } from './NutritionNormalizer'
import { FatSecretNutritionProvider } from './providers/FatSecretNutritionProvider'
import { UsdaNutritionProvider } from './providers/UsdaNutritionProvider'
import type {
  LookupLogPayload,
  NutritionLookupCandidateEvaluation,
  NutritionLookupInput,
  NutritionLookupProviderMatch,
  NutritionLookupResult,
  NutritionProvider,
  ProviderSearchResult,
} from './types'

export class NutritionLookupService {
  constructor(
    private readonly providers: NutritionProvider[] = [
      new UsdaNutritionProvider(),
      new FatSecretNutritionProvider(),
    ],
    private readonly normalizer = new NutritionNormalizer(),
  ) {}

  async lookup(input: NutritionLookupInput): Promise<NutritionLookupResult> {
    const existingSupply = input.supplyItemId
      ? await prisma.supplyItem.findUnique({ where: { id: input.supplyItemId } })
      : null

    if (existingSupply?.manualOverride && !input.force) {
      return {
        supplyItemId: existingSupply.id,
        outcome: 'manual_required',
        matched: false,
        needsReview: existingSupply.needsReview,
        source: existingSupply.source ?? null,
        confidence: existingSupply.sourceConfidence?.toNumber() ?? null,
        normalized: null,
        providerMatches: [],
        providersTried: [],
        logsCreated: 0,
        message: 'SupplyItem tiene override manual. Usa force para sobrescribir nutrición automática.',
      }
    }

    const { bestMatch, logsCreated, providersTried, providerMatches } = await this.runLookup(
      input,
      existingSupply?.id ?? null,
      false,
    )

    if (!bestMatch) {
      return {
        supplyItemId: existingSupply?.id ?? null,
        outcome: 'manual_required',
        matched: false,
        needsReview: true,
        source: null,
        confidence: null,
        normalized: null,
        providerMatches,
        providersTried,
        logsCreated,
        message: 'No hubo coincidencias útiles. Se requiere captura manual.',
      }
    }

    const needsReview = bestMatch.normalized.needsReview
    const outcome = bestMatch.normalized.sourceConfidence >= REVIEW_THRESHOLD
      ? (needsReview ? 'needs_review' : 'matched')
      : 'manual_required'

    return {
      supplyItemId: existingSupply?.id ?? null,
      outcome,
      matched: outcome !== 'manual_required',
      needsReview,
      source: bestMatch.normalized.source,
      confidence: bestMatch.normalized.sourceConfidence,
      normalized: bestMatch.normalized,
      providerMatches,
      providersTried,
      logsCreated,
      message: this.buildResultMessage(outcome, bestMatch.normalized.source, needsReview),
    }
  }

  async lookupAndPersist(input: NutritionLookupInput): Promise<NutritionLookupResult> {
    const existingSupply = input.supplyItemId
      ? await prisma.supplyItem.findUnique({ where: { id: input.supplyItemId } })
      : null

    if (existingSupply?.manualOverride && !input.force) {
      return {
        supplyItemId: existingSupply.id,
        outcome: 'manual_required',
        matched: false,
        needsReview: existingSupply.needsReview,
        source: existingSupply.source ?? null,
        confidence: existingSupply.sourceConfidence?.toNumber() ?? null,
        normalized: null,
        providerMatches: [],
        providersTried: [],
        logsCreated: 0,
        message: 'SupplyItem tiene override manual. Usa force para sobrescribir nutrición automática.',
      }
    }

    const {
      bestMatch,
      logsCreated: initialLogsCreated,
      providersTried,
      providerMatches,
    } = await this.runLookup(
      input,
      existingSupply?.id ?? null,
      true,
    )
    let logsCreated = initialLogsCreated

    if (!bestMatch) {
      const supply = await this.upsertSupplyItem(existingSupply?.id ?? null, input, null, true)

      return {
        supplyItemId: supply.id,
        outcome: 'manual_required',
        matched: false,
        needsReview: true,
        source: null,
        confidence: null,
        normalized: null,
        providerMatches,
        providersTried,
        logsCreated,
        message: 'No hubo coincidencias útiles. Se requiere captura manual.',
      }
    }

    const needsReview = bestMatch.normalized.needsReview
    const outcome = bestMatch.normalized.sourceConfidence >= REVIEW_THRESHOLD
      ? (needsReview ? 'needs_review' : 'matched')
      : 'manual_required'

    const supply = await this.upsertSupplyItem(
      existingSupply?.id ?? null,
      input,
      bestMatch.normalized,
      needsReview || outcome === 'manual_required',
    )

    logsCreated += await this.createLookupLog(supply.id, {
      source: bestMatch.normalized.source,
      sourceExternalId: bestMatch.normalized.sourceExternalId,
      query: input.name,
      normalizedQuery: this.normalizer.normalizeName(input.name),
      confidence: bestMatch.normalized.sourceConfidence,
      outcome: NutritionLookupOutcome.MATCH,
      requestSnapshot: bestMatch.providerResult.requestSnapshot ?? null,
      responseSnapshot: bestMatch.providerResult.responseSnapshot ?? null,
      selectedSnapshot: bestMatch.normalized.sourceSnapshot,
      accepted: outcome !== 'manual_required',
    })

    return {
      supplyItemId: supply.id,
      outcome,
      matched: outcome !== 'manual_required',
      needsReview: supply.needsReview,
      source: bestMatch.normalized.source,
      confidence: bestMatch.normalized.sourceConfidence,
      normalized: bestMatch.normalized,
      providerMatches,
      providersTried,
      logsCreated,
      message: this.buildResultMessage(outcome, bestMatch.normalized.source, supply.needsReview),
    }
  }

  private async runLookup(
    input: NutritionLookupInput,
    supplyItemId: string | null,
    persistLogs: boolean,
  ) {
    const evaluations: NutritionLookupCandidateEvaluation[] = []
    const providersTried: NutritionSource[] = []
    const providerErrors = new Map<NutritionSource, string>()
    let logsCreated = 0

    for (const source of PROVIDER_PRIORITY) {
      const provider = this.providers.find(item => item.source === source)

      if (!provider?.isConfigured()) {
        continue
      }

      providersTried.push(provider.source)

      try {
        const result = await provider.search({ query: input.name })
        if (persistLogs) {
          logsCreated += await this.createLookupLogs(supplyItemId, result)
        }

        evaluations.push(
          ...result.candidates.map(candidate => ({
            providerResult: result,
            candidate,
            normalized: this.normalizer.normalizeCandidate(input.name, candidate),
          })),
        )

      } catch (error) {
        providerErrors.set(
          provider.source,
          error instanceof Error ? error.message : 'Error desconocido',
        )

        if (persistLogs) {
          logsCreated += await this.createLookupLog(supplyItemId, {
            source: provider.source,
            query: input.name,
            normalizedQuery: this.normalizer.normalizeName(input.name),
            confidence: null,
            outcome: NutritionLookupOutcome.ERROR,
            errorMessage: error instanceof Error ? error.message : 'Error desconocido',
            accepted: false,
          })
        }
      }
    }

    return {
      bestMatch: this.pickBestEvaluation(evaluations),
      providerMatches: this.buildProviderMatches(
        evaluations,
        providersTried,
        providerErrors,
      ),
      logsCreated,
      providersTried,
    }
  }

  private pickBestEvaluation(evaluations: NutritionLookupCandidateEvaluation[]) {
    return [...evaluations].sort((left, right) => {
      if (right.normalized.sourceConfidence !== left.normalized.sourceConfidence) {
        return right.normalized.sourceConfidence - left.normalized.sourceConfidence
      }

      return PROVIDER_PRIORITY.indexOf(left.normalized.source)
        - PROVIDER_PRIORITY.indexOf(right.normalized.source)
    })[0] ?? null
  }

  private buildProviderMatches(
    evaluations: NutritionLookupCandidateEvaluation[],
    providersTried: NutritionSource[],
    providerErrors: Map<NutritionSource, string>,
  ): NutritionLookupProviderMatch[] {
    return providersTried.map((source) => {
      const bestEvaluation = this.pickBestEvaluation(
        evaluations.filter(
          evaluation => evaluation.normalized.source === source,
        ),
      )

      if (!bestEvaluation) {
        return {
          source,
          matched: false,
          needsReview: true,
          confidence: null,
          normalized: null,
          message: providerErrors.get(source)
            ?? `No hubo coincidencias útiles en ${source}.`,
        }
      }

      const needsReview = bestEvaluation.normalized.needsReview
      const outcome = bestEvaluation.normalized.sourceConfidence >= REVIEW_THRESHOLD
        ? (needsReview ? 'needs_review' : 'matched')
        : 'manual_required'

      return {
        source,
        matched: outcome !== 'manual_required',
        needsReview: needsReview || outcome === 'manual_required',
        confidence: bestEvaluation.normalized.sourceConfidence,
        normalized: bestEvaluation.normalized,
        message: this.buildResultMessage(
          outcome,
          bestEvaluation.normalized.source,
          needsReview || outcome === 'manual_required',
        ),
      }
    })
  }

  private async upsertSupplyItem(
    existingSupplyId: string | null,
    input: NutritionLookupInput,
    normalized: NutritionLookupCandidateEvaluation['normalized'] | null,
    needsReview: boolean,
  ) {
    const baseCreateData = {
      nombre: input.name.trim(),
      normalizedName: normalized?.normalizedName ?? this.normalizer.normalizeName(input.name),
      descripcion: input.description?.trim() ?? '',
      codigo: input.codigo ?? null,
      barcode: input.barcode ?? null,
      unidadBase: input.unidadBase ?? MeasurementUnit.GRAMO,
      status: input.status ?? SupplyItemStatus.BORRADOR,
      isActive: true,
      needsReview,
      reviewNotes: normalized
        ? normalized.reviewReasons.join(' ')
        : 'Sin coincidencia confiable. Completar nutrición manualmente.',
      source: normalized?.source ?? null,
      sourceExternalId: normalized?.sourceExternalId ?? null,
      sourceQuery: normalized?.sourceQuery ?? input.name.trim(),
      sourceConfidence: normalized?.sourceConfidence != null
        ? this.toDecimalString(normalized.sourceConfidence, 4)
        : null,
      sourceSnapshot: normalized?.sourceSnapshot ?? Prisma.JsonNull,
      lastSyncedAt: new Date(),
      categoryId: input.categoryId ?? null,
      nutritionBasis: normalized?.nutritionBasis ?? null,
      defaultServingSize: this.toDecimalString(normalized?.defaultServingSize, 2),
      defaultServingUnit: normalized?.defaultServingUnit ?? null,
      calorias: this.toDecimalString(normalized?.calories, 2),
      proteina: this.toDecimalString(normalized?.protein, 2),
      carbohidratos: this.toDecimalString(normalized?.carbs, 2),
      grasas: this.toDecimalString(normalized?.fat, 2),
      fibra: this.toDecimalString(normalized?.fiber, 2),
      azucar: this.toDecimalString(normalized?.sugar, 2),
      sodio: this.toDecimalString(normalized?.sodium, 2),
      densidad: this.toDecimalString(normalized?.density, 4),
      ediblePortionFactor: this.toDecimalString(normalized?.ediblePortionFactor, 4),
    }

    if (existingSupplyId) {
      return prisma.supplyItem.update({
        where: { id: existingSupplyId },
        data: {
          ...baseCreateData,
          nombre: input.name.trim() || undefined,
          descripcion: input.description?.trim() || undefined,
          codigo: input.codigo === undefined ? undefined : input.codigo,
          barcode: input.barcode === undefined ? undefined : input.barcode,
          unidadBase: input.unidadBase ?? undefined,
          categoryId: input.categoryId === undefined ? undefined : input.categoryId,
          status: input.status ?? undefined,
        },
      })
    }

    return prisma.supplyItem.create({
      data: baseCreateData,
    })
  }

  private async createLookupLogs(supplyItemId: string | null, result: ProviderSearchResult) {
    if (!result.candidates.length) {
      return this.createLookupLog(supplyItemId, {
        source: result.source,
        query: result.query,
        normalizedQuery: result.normalizedQuery,
        outcome: NutritionLookupOutcome.SIN_RESULTADOS,
        requestSnapshot: result.requestSnapshot ?? null,
        responseSnapshot: result.responseSnapshot ?? null,
        accepted: false,
      })
    }

    const operations = result.candidates.map(candidate =>
      this.createLookupLog(supplyItemId, {
        source: result.source,
        sourceExternalId: candidate.externalId,
        query: result.query,
        normalizedQuery: result.normalizedQuery,
        confidence: candidate.score ?? null,
        outcome: NutritionLookupOutcome.MATCH,
        requestSnapshot: result.requestSnapshot ?? null,
        responseSnapshot: result.responseSnapshot ?? null,
        selectedSnapshot: candidate.raw as Prisma.InputJsonValue,
        accepted: null,
      }),
    )

    const values = await Promise.all(operations)
    return values.reduce((sum, value) => sum + value, 0)
  }

  private async createLookupLog(supplyItemId: string | null, payload: LookupLogPayload) {
    await prisma.supplyNutritionLookupLog.create({
      data: {
        supplyItemId,
        source: payload.source,
        sourceExternalId: payload.sourceExternalId ?? null,
        query: payload.query,
        normalizedQuery: payload.normalizedQuery,
        confidence: payload.confidence != null
          ? this.toDecimalString(payload.confidence, 4)
          : null,
        outcome: payload.outcome,
        requestSnapshot: payload.requestSnapshot ?? Prisma.JsonNull,
        responseSnapshot: payload.responseSnapshot ?? Prisma.JsonNull,
        selectedSnapshot: payload.selectedSnapshot ?? Prisma.JsonNull,
        errorMessage: payload.errorMessage ?? null,
        accepted: payload.accepted ?? null,
      },
    })

    return 1
  }

  private toDecimalString(value: number | null | undefined, decimals = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null
    }

    return value.toFixed(decimals)
  }

  private buildResultMessage(
    outcome: NutritionLookupResult['outcome'],
    source: NutritionSource,
    needsReview: boolean,
  ) {
    if (outcome === 'matched' && !needsReview) {
      return `Nutrición sincronizada automáticamente desde ${source}.`
    }

    if (outcome === 'needs_review' || needsReview) {
      return `Coincidencia parcial desde ${source}. Revisar antes de aprobar.`
    }

    return 'No hubo coincidencia confiable. Completa nutrición manualmente.'
  }
}
