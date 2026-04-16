import type { Prisma } from '~~/prisma/generated/client/client'
import { MeasurementUnit, NutritionBasis } from '~~/prisma/generated/client/enums'
import { prisma } from '~~/server/utils/prisma'
import type {
  NullableNumber,
  NutritionMacroPayload,
  RecipeNutritionComputationResult,
} from './types'
import {
  convertBetweenUnits,
  convertToGrams,
  convertToMilliliters,
  isMassUnit,
  isUnitLike,
  isVolumeUnit,
} from '~~/server/utils/nutrition/measurements'

type RecipeIngredientWithSupply = Prisma.RecipeIngredientGetPayload<{
  include: {
    supplyItem: true
  }
}>

export class RecipeNutritionCalculator {
  async calculateAndCache(recipeId: string): Promise<RecipeNutritionComputationResult> {
    const recipe = await prisma.recipe.findUnique({
      where: { id: recipeId },
      include: {
        ingredients: {
          include: {
            supplyItem: true,
          },
          orderBy: {
            orden: 'asc',
          },
        },
      },
    })

    if (!recipe) {
      throw new Error('Recipe no encontrada.')
    }

    const totals: NutritionMacroPayload = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      sodium: 0,
    }

    let estimatedCost = 0
    let totalWeightGrams = 0
    let hasCost = false
    let hasWeight = false
    let ingredientsResolved = 0

    for (const ingredient of recipe.ingredients) {
      const factor = this.resolveNutritionFactor(ingredient)

      if (factor !== null) {
        ingredientsResolved += 1
        this.accumulateNutrition(totals, ingredient, factor)
      }

      const baseQuantity = this.resolveBaseQuantity(ingredient)

      if (baseQuantity !== null && ingredient.supplyItem.costoReferencial !== null) {
        estimatedCost += ingredient.supplyItem.costoReferencial.toNumber() * baseQuantity
        hasCost = true
      }

      const ingredientWeight = this.resolveWeightInGrams(ingredient)

      if (ingredientWeight !== null) {
        totalWeightGrams += ingredientWeight
        hasWeight = true
      }
    }

    const payload: RecipeNutritionComputationResult = {
      recipeId: recipe.id,
      ingredientsProcessed: recipe.ingredients.length,
      ingredientsResolved,
      ingredientsSkipped: recipe.ingredients.length - ingredientsResolved,
      calories: this.normalizeTotal(totals.calories),
      protein: this.normalizeTotal(totals.protein),
      carbs: this.normalizeTotal(totals.carbs),
      fat: this.normalizeTotal(totals.fat),
      fiber: this.normalizeTotal(totals.fiber),
      sugar: this.normalizeTotal(totals.sugar),
      sodium: this.normalizeTotal(totals.sodium),
      estimatedCost: hasCost ? this.normalizeTotal(estimatedCost) : null,
      totalWeightGrams: hasWeight ? this.normalizeTotal(totalWeightGrams) : null,
      nutritionCalculatedAt: new Date().toISOString(),
    }

    await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        calorias: this.toDecimalString(payload.calories, 2),
        proteina: this.toDecimalString(payload.protein, 2),
        carbohidratos: this.toDecimalString(payload.carbs, 2),
        grasas: this.toDecimalString(payload.fat, 2),
        fibra: this.toDecimalString(payload.fiber, 2),
        azucar: this.toDecimalString(payload.sugar, 2),
        sodio: this.toDecimalString(payload.sodium, 2),
        costoEstimado: this.toDecimalString(payload.estimatedCost, 2),
        pesoTotalGramos: this.toDecimalString(payload.totalWeightGrams, 2),
        nutritionCalculatedAt: new Date(payload.nutritionCalculatedAt),
      },
    })

    return payload
  }

  private accumulateNutrition(
    totals: NutritionMacroPayload,
    ingredient: RecipeIngredientWithSupply,
    factor: number,
  ) {
    totals.calories = (totals.calories ?? 0) + this.multiplyNullable(ingredient.supplyItem.calorias?.toNumber() ?? null, factor)
    totals.protein = (totals.protein ?? 0) + this.multiplyNullable(ingredient.supplyItem.proteina?.toNumber() ?? null, factor)
    totals.carbs = (totals.carbs ?? 0) + this.multiplyNullable(ingredient.supplyItem.carbohidratos?.toNumber() ?? null, factor)
    totals.fat = (totals.fat ?? 0) + this.multiplyNullable(ingredient.supplyItem.grasas?.toNumber() ?? null, factor)
    totals.fiber = (totals.fiber ?? 0) + this.multiplyNullable(ingredient.supplyItem.fibra?.toNumber() ?? null, factor)
    totals.sugar = (totals.sugar ?? 0) + this.multiplyNullable(ingredient.supplyItem.azucar?.toNumber() ?? null, factor)
    totals.sodium = (totals.sodium ?? 0) + this.multiplyNullable(ingredient.supplyItem.sodio?.toNumber() ?? null, factor)
  }

  private resolveNutritionFactor(ingredient: RecipeIngredientWithSupply): NullableNumber {
    const basis = ingredient.supplyItem.nutritionBasis

    if (!basis) {
      return null
    }

    const grams = this.resolveWeightInGrams(ingredient)
    const milliliters = this.resolveVolumeInMilliliters(ingredient)

    if (basis === NutritionBasis.POR_100_GRAMOS) {
      return grams === null ? null : grams / 100
    }

    if (basis === NutritionBasis.POR_100_MILILITROS) {
      return milliliters === null ? null : milliliters / 100
    }

    if (basis === NutritionBasis.POR_UNIDAD) {
      if (isUnitLike(ingredient.unidad)) {
        return ingredient.cantidad.toNumber()
      }

      const defaultServingFactor = this.resolveServingFactor(ingredient)
      return defaultServingFactor
    }

    return this.resolveServingFactor(ingredient)
  }

  private resolveServingFactor(ingredient: RecipeIngredientWithSupply): NullableNumber {
    const servingSize = ingredient.supplyItem.defaultServingSize?.toNumber() ?? null
    const servingUnit = ingredient.supplyItem.defaultServingUnit

    if (!servingSize || !servingUnit) {
      return null
    }

    if (isUnitLike(servingUnit) && isUnitLike(ingredient.unidad)) {
      return ingredient.cantidad.toNumber() / servingSize
    }

    const quantity = this.resolveQuantityForUnit(ingredient, servingUnit)
    return quantity === null ? null : quantity / servingSize
  }

  private resolveBaseQuantity(ingredient: RecipeIngredientWithSupply): NullableNumber {
    if (ingredient.quantityInBaseUnit !== null) {
      return ingredient.quantityInBaseUnit.toNumber()
    }

    return convertBetweenUnits(
      ingredient.cantidad.toNumber(),
      ingredient.unidad,
      ingredient.supplyItem.unidadBase,
    )
  }

  private resolveQuantityForUnit(
    ingredient: RecipeIngredientWithSupply,
    targetUnit: MeasurementUnit,
  ) {
    if (ingredient.quantityInBaseUnit !== null && ingredient.supplyItem.unidadBase === targetUnit) {
      return ingredient.quantityInBaseUnit.toNumber()
    }

    return convertBetweenUnits(
      ingredient.cantidad.toNumber(),
      ingredient.unidad,
      targetUnit,
    )
  }

  private resolveWeightInGrams(ingredient: RecipeIngredientWithSupply): NullableNumber {
    if (ingredient.quantityInBaseUnit !== null && isMassUnit(ingredient.supplyItem.unidadBase)) {
      return convertToGrams(ingredient.quantityInBaseUnit.toNumber(), ingredient.supplyItem.unidadBase)
    }

    const direct = convertToGrams(ingredient.cantidad.toNumber(), ingredient.unidad)

    if (direct !== null) {
      return direct
    }

    if (ingredient.quantityInBaseUnit !== null && isVolumeUnit(ingredient.supplyItem.unidadBase)) {
      const density = ingredient.supplyItem.densidad?.toNumber() ?? null
      const milliliters = convertToMilliliters(ingredient.quantityInBaseUnit.toNumber(), ingredient.supplyItem.unidadBase)
      return milliliters !== null && density !== null ? milliliters * density : null
    }

    const servingSize = ingredient.supplyItem.defaultServingSize?.toNumber() ?? null
    const servingUnit = ingredient.supplyItem.defaultServingUnit

    if (servingSize && servingUnit && isMassUnit(servingUnit) && isUnitLike(ingredient.unidad)) {
      return convertToGrams(ingredient.cantidad.toNumber() * servingSize, servingUnit)
    }

    return null
  }

  private resolveVolumeInMilliliters(ingredient: RecipeIngredientWithSupply): NullableNumber {
    if (ingredient.quantityInBaseUnit !== null && isVolumeUnit(ingredient.supplyItem.unidadBase)) {
      return convertToMilliliters(ingredient.quantityInBaseUnit.toNumber(), ingredient.supplyItem.unidadBase)
    }

    const direct = convertToMilliliters(ingredient.cantidad.toNumber(), ingredient.unidad)

    if (direct !== null) {
      return direct
    }

    const servingSize = ingredient.supplyItem.defaultServingSize?.toNumber() ?? null
    const servingUnit = ingredient.supplyItem.defaultServingUnit

    if (servingSize && servingUnit && isVolumeUnit(servingUnit) && isUnitLike(ingredient.unidad)) {
      return convertToMilliliters(ingredient.cantidad.toNumber() * servingSize, servingUnit)
    }

    return null
  }

  private multiplyNullable(value: NullableNumber, factor: number) {
    return value === null ? 0 : value * factor
  }

  private normalizeTotal(value: NullableNumber) {
    if (value === null) {
      return null
    }

    return Math.round(value * 100) / 100
  }

  private toDecimalString(value: NullableNumber, decimals = 2) {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return null
    }

    return value.toFixed(decimals)
  }
}
