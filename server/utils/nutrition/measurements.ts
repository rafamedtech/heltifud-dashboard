import type { MeasurementUnit, NutritionBasis } from '~~/prisma/generated/client/enums'
import {
  MASS_UNITS_IN_GRAMS,
  UNIT_LIKE_MEASUREMENT_UNITS,
  VOLUME_UNITS_IN_MILLILITERS,
} from '~~/server/services/nutrition/constants'
import type { NullableNumber } from '~~/server/services/nutrition/types'

export function measurementUnitFromString(value: string | null | undefined): MeasurementUnit | null {
  if (!value) {
    return null
  }

  const normalized = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleUpperCase('es-MX')

  const aliases: Record<string, MeasurementUnit> = {
    G: 'GRAMO',
    GRAM: 'GRAMO',
    GRAMOS: 'GRAMO',
    ML: 'MILILITRO',
    MILLILITER: 'MILILITRO',
    MILLILITERS: 'MILILITRO',
    KG: 'KILOGRAMO',
    KILOGRAM: 'KILOGRAMO',
    KILOGRAMS: 'KILOGRAMO',
    L: 'LITRO',
    LITER: 'LITRO',
    LITERS: 'LITRO',
    CUP: 'TAZA',
    CUPS: 'TAZA',
    TBSP: 'CUCHARADA',
    TSP: 'CUCHARADITA',
    OZ: 'ONZA',
    LB: 'LIBRA',
    SERVING: 'PORCION',
    PORTION: 'PORCION',
    UNIT: 'PIEZA',
    PIECE: 'PIEZA',
  }

  return aliases[normalized] ?? (normalized in MASS_UNITS_IN_GRAMS
    || normalized in VOLUME_UNITS_IN_MILLILITERS
    || UNIT_LIKE_MEASUREMENT_UNITS.has(normalized as MeasurementUnit)
    ? normalized as MeasurementUnit
    : null)
}

export function isMassUnit(unit: MeasurementUnit | null | undefined) {
  return Boolean(unit && unit in MASS_UNITS_IN_GRAMS)
}

export function isVolumeUnit(unit: MeasurementUnit | null | undefined) {
  return Boolean(unit && unit in VOLUME_UNITS_IN_MILLILITERS)
}

export function isUnitLike(unit: MeasurementUnit | null | undefined) {
  return Boolean(unit && UNIT_LIKE_MEASUREMENT_UNITS.has(unit))
}

export function convertToGrams(quantity: NullableNumber, unit: MeasurementUnit | null | undefined) {
  if (quantity === null || !unit || !isMassUnit(unit)) {
    return null
  }

  return quantity * MASS_UNITS_IN_GRAMS[unit]
}

export function convertToMilliliters(quantity: NullableNumber, unit: MeasurementUnit | null | undefined) {
  if (quantity === null || !unit || !isVolumeUnit(unit)) {
    return null
  }

  return quantity * VOLUME_UNITS_IN_MILLILITERS[unit]
}

export function convertBetweenUnits(
  quantity: NullableNumber,
  fromUnit: MeasurementUnit | null | undefined,
  toUnit: MeasurementUnit | null | undefined,
) {
  if (quantity === null || !fromUnit || !toUnit) {
    return null
  }

  if (fromUnit === toUnit) {
    return quantity
  }

  if (isMassUnit(fromUnit) && isMassUnit(toUnit)) {
    const grams = convertToGrams(quantity, fromUnit)
    return grams === null ? null : grams / MASS_UNITS_IN_GRAMS[toUnit]
  }

  if (isVolumeUnit(fromUnit) && isVolumeUnit(toUnit)) {
    const milliliters = convertToMilliliters(quantity, fromUnit)
    return milliliters === null ? null : milliliters / VOLUME_UNITS_IN_MILLILITERS[toUnit]
  }

  return null
}

export function resolveBasisFromMetric(
  amount: NullableNumber,
  unit: MeasurementUnit | null | undefined,
): NutritionBasis | null {
  if (amount === null || !unit) {
    return null
  }

  if (isMassUnit(unit) && Math.abs(convertToGrams(amount, unit)! - 100) < 0.0001) {
    return 'POR_100_GRAMOS'
  }

  if (
    isVolumeUnit(unit)
    && Math.abs(convertToMilliliters(amount, unit)! - 100) < 0.0001
  ) {
    return 'POR_100_MILILITROS'
  }

  if (isUnitLike(unit)) {
    return 'POR_UNIDAD'
  }

  return 'POR_PORCION'
}
