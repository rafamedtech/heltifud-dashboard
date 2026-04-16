import { createError } from 'h3'
import { NutritionSource, SupplyItemStatus } from '~~/prisma/generated/client/enums'
import { prisma } from '~~/server/utils/prisma'
import { NutritionLookupService } from './NutritionLookupService'
import type { NutritionBasis, MeasurementUnit } from '~~/prisma/generated/client/enums'
import type { NutritionLookupResult } from './types'

export interface CreateAdminSupplyInput {
  nombre: string
  descripcion?: string
  codigo?: string | null
  barcode?: string | null
  unidadBase: MeasurementUnit
  tags?: string[]
  isActive?: boolean
  costoReferencial?: number | null
  mermaPorcentaje?: number | null
  categoryId?: string | null
  status?: SupplyItemStatus
  autoLookup?: boolean
  forceLookup?: boolean
}

export interface ConfirmSupplyNutritionInput {
  nombre?: string
  descripcion?: string
  codigo?: string | null
  barcode?: string | null
  unidadBase?: MeasurementUnit
  categoryId?: string | null
  tags?: string[]
  isActive?: boolean
  status?: SupplyItemStatus
  nutritionBasis?: NutritionBasis | null
  defaultServingSize?: number | null
  defaultServingUnit?: MeasurementUnit | null
  calorias?: number | null
  proteina?: number | null
  carbohidratos?: number | null
  grasas?: number | null
  fibra?: number | null
  azucar?: number | null
  sodio?: number | null
  densidad?: number | null
  ediblePortionFactor?: number | null
  source?: NutritionSource | null
  sourceExternalId?: string | null
  sourceQuery?: string | null
  sourceConfidence?: number | null
  sourceSnapshot?: unknown
  reviewNotes?: string
  needsReview?: boolean
  manualOverride?: boolean
}

export class NutritionSupplyAdminService {
  constructor(
    private readonly lookupService = new NutritionLookupService(),
  ) {}

  async createSupply(input: CreateAdminSupplyInput) {
    const supply = await prisma.supplyItem.create({
      data: {
        nombre: input.nombre.trim(),
        normalizedName: this.normalizeName(input.nombre),
        descripcion: input.descripcion?.trim() ?? '',
        codigo: input.codigo ?? null,
        barcode: input.barcode ?? null,
        unidadBase: input.unidadBase,
        tags: this.normalizeTags(input.tags),
        isActive: input.isActive ?? true,
        costoReferencial: this.toDecimalString(input.costoReferencial, 2),
        mermaPorcentaje: this.toDecimalString(input.mermaPorcentaje, 2),
        categoryId: input.categoryId ?? null,
        status: input.status ?? SupplyItemStatus.BORRADOR,
      },
    })

    let lookup: NutritionLookupResult | null = null

    if (input.autoLookup) {
      lookup = await this.lookupService.lookupAndPersist({
        supplyItemId: supply.id,
        name: input.nombre,
        description: input.descripcion,
        codigo: input.codigo ?? null,
        barcode: input.barcode ?? null,
        unidadBase: input.unidadBase,
        categoryId: input.categoryId ?? null,
        status: input.status ?? SupplyItemStatus.BORRADOR,
        force: input.forceLookup ?? false,
      })
    }

    const persisted = await this.getSupplyOrThrow(supply.id)

    return {
      supply: persisted,
      lookup,
    }
  }

  async confirmSupply(id: string, input: ConfirmSupplyNutritionInput) {
    await this.getSupplyOrThrow(id)

    await prisma.supplyItem.update({
      where: { id },
      data: {
        nombre: input.nombre?.trim() || undefined,
        normalizedName: input.nombre?.trim() ? this.normalizeName(input.nombre) : undefined,
        descripcion: input.descripcion?.trim() ?? undefined,
        codigo: input.codigo === undefined ? undefined : input.codigo,
        barcode: input.barcode === undefined ? undefined : input.barcode,
        unidadBase: input.unidadBase ?? undefined,
        categoryId: input.categoryId === undefined ? undefined : input.categoryId,
        tags: input.tags ? this.normalizeTags(input.tags) : undefined,
        isActive: input.isActive ?? undefined,
        status: input.status ?? undefined,
        nutritionBasis: input.nutritionBasis === undefined ? undefined : input.nutritionBasis,
        defaultServingSize: this.toDecimalStringOrUndefined(input.defaultServingSize, 2),
        defaultServingUnit: input.defaultServingUnit === undefined ? undefined : input.defaultServingUnit,
        calorias: this.toDecimalStringOrUndefined(input.calorias, 2),
        proteina: this.toDecimalStringOrUndefined(input.proteina, 2),
        carbohidratos: this.toDecimalStringOrUndefined(input.carbohidratos, 2),
        grasas: this.toDecimalStringOrUndefined(input.grasas, 2),
        fibra: this.toDecimalStringOrUndefined(input.fibra, 2),
        azucar: this.toDecimalStringOrUndefined(input.azucar, 2),
        sodio: this.toDecimalStringOrUndefined(input.sodio, 2),
        densidad: this.toDecimalStringOrUndefined(input.densidad, 4),
        ediblePortionFactor: this.toDecimalStringOrUndefined(input.ediblePortionFactor, 4),
        source: input.source === undefined ? undefined : input.source,
        sourceExternalId: input.sourceExternalId === undefined ? undefined : input.sourceExternalId,
        sourceQuery: input.sourceQuery === undefined ? undefined : input.sourceQuery,
        sourceConfidence: this.toDecimalStringOrUndefined(input.sourceConfidence, 4),
        sourceSnapshot: input.sourceSnapshot === undefined ? undefined : input.sourceSnapshot as any,
        needsReview: input.needsReview ?? false,
        reviewNotes: input.reviewNotes ?? '',
        manualOverride: input.manualOverride ?? true,
        lastSyncedAt: new Date(),
      },
    })

    return this.getSupplyOrThrow(id)
  }

  async getSupplyOrThrow(id: string) {
    const supply = await prisma.supplyItem.findUnique({
      where: { id },
      include: {
        category: true,
      },
    })

    if (!supply) {
      throw createError({ statusCode: 404, statusMessage: 'Insumo no encontrado.' })
    }

    return this.mapSupplyItem(supply)
  }

  private mapSupplyItem(supply: any) {
    return {
      id: supply.id,
      createdAt: supply.createdAt.toISOString(),
      updatedAt: supply.updatedAt.toISOString(),
      nombre: supply.nombre,
      normalizedName: supply.normalizedName,
      descripcion: supply.descripcion,
      codigo: supply.codigo,
      barcode: supply.barcode,
      unidadBase: supply.unidadBase,
      defaultServingSize: supply.defaultServingSize?.toNumber() ?? null,
      defaultServingUnit: supply.defaultServingUnit,
      nutritionBasis: supply.nutritionBasis,
      calorias: supply.calorias?.toNumber() ?? null,
      proteina: supply.proteina?.toNumber() ?? null,
      carbohidratos: supply.carbohidratos?.toNumber() ?? null,
      grasas: supply.grasas?.toNumber() ?? null,
      fibra: supply.fibra?.toNumber() ?? null,
      azucar: supply.azucar?.toNumber() ?? null,
      sodio: supply.sodio?.toNumber() ?? null,
      densidad: supply.densidad?.toNumber() ?? null,
      ediblePortionFactor: supply.ediblePortionFactor?.toNumber() ?? null,
      tags: supply.tags,
      source: supply.source,
      sourceExternalId: supply.sourceExternalId,
      sourceQuery: supply.sourceQuery,
      sourceConfidence: supply.sourceConfidence?.toNumber() ?? null,
      sourceSnapshot: supply.sourceSnapshot,
      lastSyncedAt: supply.lastSyncedAt?.toISOString() ?? null,
      manualOverride: supply.manualOverride,
      needsReview: supply.needsReview,
      reviewNotes: supply.reviewNotes,
      status: supply.status,
      isActive: supply.isActive,
      costoReferencial: supply.costoReferencial?.toNumber() ?? null,
      mermaPorcentaje: supply.mermaPorcentaje?.toNumber() ?? null,
      category: 'category' in supply && supply.category
        ? {
            id: supply.category.id,
            nombre: supply.category.nombre,
            slug: supply.category.slug,
          }
        : null,
    }
  }

  private normalizeName(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-MX')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  private normalizeTags(tags?: string[]) {
    return Array.from(
      new Set((tags ?? []).map(tag => tag.trim()).filter(Boolean)),
    )
  }

  private toDecimalString(value: number | null | undefined, decimals = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null
    }

    return value.toFixed(decimals)
  }

  private toDecimalStringOrUndefined(value: number | null | undefined, decimals = 2) {
    if (value === undefined) {
      return undefined
    }

    return this.toDecimalString(value, decimals)
  }
}
