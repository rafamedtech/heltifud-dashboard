import { createError } from 'h3'
import {
  MeasurementUnit,
  NutritionBasis,
  NutritionSource,
  SupplyItemStatus,
} from '~~/prisma/generated/client/enums'
import type {
  ConfirmSupplyNutritionInput,
  CreateAdminSupplyInput,
} from '~~/server/services/nutrition/NutritionSupplyAdminService'
import type { NutritionLookupInput } from '~~/server/services/nutrition/types'

function asObject(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Payload inválido.' })
  }

  return value as Record<string, unknown>
}

function asNonEmptyString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw createError({ statusCode: 400, statusMessage: `${field} es obligatorio.` })
  }

  return value.trim()
}

function asOptionalString(value: unknown) {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Valor de texto inválido.' })
  }

  return value.trim()
}

function asOptionalBoolean(value: unknown) {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') {
    throw createError({ statusCode: 400, statusMessage: 'Valor booleano inválido.' })
  }

  return value
}

function asOptionalNumber(value: unknown) {
  if (value === undefined) return undefined
  if (value === null) return null

  const numeric = Number(value)

  if (!Number.isFinite(numeric)) {
    throw createError({ statusCode: 400, statusMessage: 'Valor numérico inválido.' })
  }

  return numeric
}

function asOptionalStringArray(value: unknown) {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    throw createError({ statusCode: 400, statusMessage: 'Lista inválida.' })
  }

  return value.map(item => asNonEmptyString(item, 'Elemento de lista'))
}

function asEnumValue<T extends Record<string, string>>(
  value: unknown,
  enumObject: T,
  field: string,
) {
  if (typeof value !== 'string' || !(value in enumObject)) {
    throw createError({ statusCode: 400, statusMessage: `${field} inválido.` })
  }

  return value as T[keyof T]
}

function asOptionalEnumValue<T extends Record<string, string>>(
  value: unknown,
  enumObject: T,
  field: string,
) {
  if (value === undefined) return undefined
  if (value === null) return null
  return asEnumValue(value, enumObject, field)
}

export async function parseLookupNutritionBody(event: Parameters<typeof readBody>[0]): Promise<NutritionLookupInput> {
  const body = asObject(await readBody(event))

  return {
    supplyItemId: asOptionalString(body.supplyItemId) ?? undefined,
    name: asNonEmptyString(body.name, 'name'),
    description: asOptionalString(body.description) ?? undefined,
    codigo: asOptionalString(body.codigo) ?? undefined,
    barcode: asOptionalString(body.barcode) ?? undefined,
    unidadBase: asOptionalEnumValue(body.unidadBase, MeasurementUnit, 'unidadBase') ?? undefined,
    categoryId: asOptionalString(body.categoryId) ?? undefined,
    status: asOptionalEnumValue(body.status, SupplyItemStatus, 'status') ?? undefined,
    force: asOptionalBoolean(body.force) ?? undefined,
  }
}

export async function parseCreateAdminSupplyBody(
  event: Parameters<typeof readBody>[0],
): Promise<CreateAdminSupplyInput> {
  const body = asObject(await readBody(event))

  return {
    nombre: asNonEmptyString(body.nombre, 'nombre'),
    descripcion: asOptionalString(body.descripcion) ?? '',
    codigo: asOptionalString(body.codigo) ?? undefined,
    barcode: asOptionalString(body.barcode) ?? undefined,
    unidadBase: asEnumValue(body.unidadBase, MeasurementUnit, 'unidadBase'),
    tags: asOptionalStringArray(body.tags),
    isActive: asOptionalBoolean(body.isActive),
    costoReferencial: asOptionalNumber(body.costoReferencial),
    mermaPorcentaje: asOptionalNumber(body.mermaPorcentaje),
    categoryId: asOptionalString(body.categoryId) ?? undefined,
    status: asOptionalEnumValue(body.status, SupplyItemStatus, 'status') ?? undefined,
    autoLookup: asOptionalBoolean(body.autoLookup),
    forceLookup: asOptionalBoolean(body.forceLookup),
  }
}

export async function parseConfirmSupplyBody(
  event: Parameters<typeof readBody>[0],
): Promise<ConfirmSupplyNutritionInput> {
  const body = asObject(await readBody(event))

  return {
    nombre: asOptionalString(body.nombre) ?? undefined,
    descripcion: asOptionalString(body.descripcion) ?? undefined,
    codigo: asOptionalString(body.codigo) ?? undefined,
    barcode: asOptionalString(body.barcode) ?? undefined,
    unidadBase: asOptionalEnumValue(body.unidadBase, MeasurementUnit, 'unidadBase') ?? undefined,
    categoryId: asOptionalString(body.categoryId) ?? undefined,
    tags: asOptionalStringArray(body.tags),
    isActive: asOptionalBoolean(body.isActive),
    status: asOptionalEnumValue(body.status, SupplyItemStatus, 'status') ?? undefined,
    nutritionBasis: asOptionalEnumValue(body.nutritionBasis, NutritionBasis, 'nutritionBasis') ?? undefined,
    defaultServingSize: asOptionalNumber(body.defaultServingSize),
    defaultServingUnit: asOptionalEnumValue(body.defaultServingUnit, MeasurementUnit, 'defaultServingUnit') ?? undefined,
    calorias: asOptionalNumber(body.calorias),
    proteina: asOptionalNumber(body.proteina),
    carbohidratos: asOptionalNumber(body.carbohidratos),
    grasas: asOptionalNumber(body.grasas),
    fibra: asOptionalNumber(body.fibra),
    azucar: asOptionalNumber(body.azucar),
    sodio: asOptionalNumber(body.sodio),
    densidad: asOptionalNumber(body.densidad),
    ediblePortionFactor: asOptionalNumber(body.ediblePortionFactor),
    source: asOptionalEnumValue(body.source, NutritionSource, 'source') ?? undefined,
    sourceExternalId: asOptionalString(body.sourceExternalId) ?? undefined,
    sourceQuery: asOptionalString(body.sourceQuery) ?? undefined,
    sourceConfidence: asOptionalNumber(body.sourceConfidence),
    sourceSnapshot: body.sourceSnapshot,
    reviewNotes: asOptionalString(body.reviewNotes) ?? undefined,
    needsReview: asOptionalBoolean(body.needsReview),
    manualOverride: asOptionalBoolean(body.manualOverride),
  }
}
