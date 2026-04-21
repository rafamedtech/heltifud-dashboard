import { z } from 'zod'

import {
  DAY_OF_WEEK_VALUES,
  MEASUREMENT_UNIT_VALUES,
  RECIPE_STATUS_VALUES,
  USER_CUSTOMER_TYPE_VALUES,
  USER_GENDER_VALUES,
  USER_ROLE_VALUES,
  USER_SOURCE_VALUES,
  USER_STATUS_VALUES
} from './types'

const REQUIRED_DAY_VALUES = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'] as const
const SLOT_KEYS = ['desayuno', 'comida', 'cena', 'snack1', 'snack2'] as const

export const foodItemSchema = z.object({
  catalogItemId: z.string().uuid().nullable().optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().default(''),
  calorias: z.number().int().min(0),
  imagen: z.string().default(''),
  tipo: z.string().min(1, 'El tipo es obligatorio')
})

const optionalFoodItemSchema = z.object({
  catalogItemId: z.string().uuid().nullable().optional(),
  nombre: z.string().default(''),
  descripcion: z.string().default(''),
  calorias: z.number().int().min(0).default(0),
  imagen: z.string().default(''),
  tipo: z.string().default('')
})

const menuSlotSchema = z.object({
  platilloPrincipal: optionalFoodItemSchema,
  guarnicion1: optionalFoodItemSchema.nullable().optional(),
  guarnicion2: optionalFoodItemSchema.nullable().optional(),
  contenedor: z.string().nullable().optional(),
  adicionales: z.array(foodItemSchema)
})

const dayMenuSchema = z.object({
  dayOfWeek: z.enum(DAY_OF_WEEK_VALUES),
  desayuno: menuSlotSchema,
  comida: menuSlotSchema,
  cena: menuSlotSchema,
  snack1: menuSlotSchema,
  snack2: menuSlotSchema
})

function hasFoodItemContent(item: z.infer<typeof optionalFoodItemSchema> | null | undefined) {
  if (!item) {
    return false
  }

  return Boolean(
    item.nombre?.trim()
    || item.descripcion?.trim()
    || item.imagen?.trim()
    || item.tipo?.trim()
    || (item.calorias ?? 0) > 0
  )
}

function slotHasContent(slot: z.infer<typeof menuSlotSchema>) {
  return hasFoodItemContent(slot.platilloPrincipal)
    || hasFoodItemContent(slot.guarnicion1)
    || hasFoodItemContent(slot.guarnicion2)
    || Boolean(slot.contenedor?.trim())
    || slot.adicionales.length > 0
}

export const weeklyMenuInputSchema = z
  .object({
    name: z.string().min(2, 'Nombre de menú muy corto'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    days: z.array(dayMenuSchema).length(7, 'El menú debe tener exactamente 7 días')
  })
  .superRefine((value, ctx) => {
    if (value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['startDate'],
        message: 'La fecha de inicio debe ser menor o igual a la fecha final'
      })
    }

    const unique = new Set(value.days.map(day => day.dayOfWeek))
    if (unique.size !== 7) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['days'],
        message: 'No se deben repetir días de la semana'
      })
    }

    value.days.forEach((day, dayIndex) => {
      const isRequiredDay = REQUIRED_DAY_VALUES.includes(day.dayOfWeek as (typeof REQUIRED_DAY_VALUES)[number])

      SLOT_KEYS.forEach((slotKey) => {
        const slot = day[slotKey]
        const mainDish = slot.platilloPrincipal
        const mainDishHasContent = hasFoodItemContent(mainDish)

        if (isRequiredDay) {
          if (!mainDish?.nombre?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['days', dayIndex, slotKey, 'platilloPrincipal', 'nombre'],
              message: 'El nombre es obligatorio'
            })
          }

          if (!mainDish?.tipo?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['days', dayIndex, slotKey, 'platilloPrincipal', 'tipo'],
              message: 'El tipo es obligatorio'
            })
          }

          return
        }

        if (slotHasContent(slot) && !mainDishHasContent) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['days', dayIndex, slotKey, 'platilloPrincipal', 'nombre'],
            message: 'Agrega un platillo principal o limpia el contenido de este tiempo.'
          })
        }

        if (mainDishHasContent) {
          if (!mainDish?.nombre?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['days', dayIndex, slotKey, 'platilloPrincipal', 'nombre'],
              message: 'El nombre es obligatorio'
            })
          }

          if (!mainDish?.tipo?.trim()) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['days', dayIndex, slotKey, 'platilloPrincipal', 'tipo'],
              message: 'El tipo es obligatorio'
            })
          }
        }
      })
    })
  })

export type WeeklyMenuInputParsed = z.infer<typeof weeklyMenuInputSchema>
const measurementUnitSchema = z.enum(MEASUREMENT_UNIT_VALUES)
const recipeStatusSchema = z.enum(RECIPE_STATUS_VALUES)
const uuidSchema = z.string().uuid()

const recipeIngredientInputSchema = z.object({
  supplyName: z.string().min(1, 'El insumo es obligatorio'),
  supplyDescription: z.string().default(''),
  supplyCode: z.string().trim().nullable().optional(),
  supplyUnitBase: measurementUnitSchema,
  supplyCategoryName: z.string().trim().nullable().optional(),
  supplyTags: z.array(z.string().trim().min(1)).default([]),
  supplyCostoReferencial: z.number().min(0).nullable().optional(),
  supplyMermaPorcentaje: z.number().min(0).max(100).nullable().optional(),
  supplyCalorias: z.number().min(0).nullable().optional(),
  supplyProteina: z.number().min(0).nullable().optional(),
  supplyCarbohidratos: z.number().min(0).nullable().optional(),
  supplyGrasas: z.number().min(0).nullable().optional(),
  supplyFibra: z.number().min(0).nullable().optional(),
  supplyAzucar: z.number().min(0).nullable().optional(),
  supplySodio: z.number().min(0).nullable().optional(),
  supplyNutritionBasis: z.enum(['POR_100_GRAMOS', 'POR_100_MILILITROS', 'POR_PORCION', 'POR_UNIDAD']).nullable().optional(),
  supplyDefaultServingSize: z.number().min(0).nullable().optional(),
  supplyDefaultServingUnit: measurementUnitSchema.nullable().optional(),
  supplyDensidad: z.number().min(0).nullable().optional(),
  grupo: z.string().trim().nullable().optional(),
  cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
  unidad: measurementUnitSchema,
  notas: z.string().default(''),
  opcional: z.boolean().default(false)
})

const recipeInputSchema = z.object({
  status: recipeStatusSchema.default('BORRADOR'),
  porciones: z.number().int().positive().nullable().optional(),
  rendimientoCantidad: z.number().positive().nullable().optional(),
  rendimientoUnidad: measurementUnitSchema.nullable().optional(),
  tiempoPreparacionMin: z.number().int().min(0).nullable().optional(),
  tiempoCoccionMin: z.number().int().min(0).nullable().optional(),
  instrucciones: z.string().default(''),
  notas: z.string().default(''),
  ingredients: z.array(recipeIngredientInputSchema).default([])
}).superRefine((value, ctx) => {
  if (value.rendimientoCantidad && !value.rendimientoUnidad) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rendimientoUnidad'],
      message: 'Selecciona la unidad del rendimiento.'
    })
  }

  const seenIngredientKeys = new Set<string>()

  value.ingredients.forEach((ingredient, index) => {
    const key = [
      ingredient.supplyName.trim().toLocaleLowerCase('es-MX'),
      ingredient.grupo?.trim().toLocaleLowerCase('es-MX') ?? '',
      ingredient.unidad
    ].join('::')

    if (seenIngredientKeys.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ingredients', index, 'supplyName'],
        message: 'Este insumo ya está repetido en la receta.'
      })
      return
    }

    seenIngredientKeys.add(key)
  })
})

export const foodCatalogItemInputSchema = foodItemSchema.extend({
  recipe: recipeInputSchema.nullable().optional()
})
export type FoodCatalogItemInputParsed = z.infer<typeof foodCatalogItemInputSchema>

export const supplyCategoryInputSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().default(''),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0)
})

export const supplyItemInputSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().default(''),
  codigo: z.string().trim().nullable().optional(),
  unidadBase: measurementUnitSchema,
  tags: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
  costoReferencial: z.number().min(0).nullable().optional(),
  mermaPorcentaje: z.number().min(0).max(100).nullable().optional(),
  categoryId: uuidSchema.nullable().optional()
})

export type SupplyCategoryInputParsed = z.infer<typeof supplyCategoryInputSchema>
export type SupplyItemInputParsed = z.infer<typeof supplyItemInputSchema>

export const adminUserInputSchema = z.object({
  email: z.email('Ingresa un correo electrónico válido.'),
  nombre: z.string().trim().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().trim().default(''),
  telefono: z.string().trim().nullable().optional(),
  role: z.enum(USER_ROLE_VALUES),
  status: z.enum(USER_STATUS_VALUES),
  source: z.enum(USER_SOURCE_VALUES).nullable().optional(),
  gender: z.enum(USER_GENDER_VALUES).nullable().optional(),
  customerType: z.enum(USER_CUSTOMER_TYPE_VALUES).nullable().optional(),
  tags: z.array(z.string().trim().min(1)).default([]),
  primaryAddress: z.string().default(''),
  primaryAddress2: z.string().default(''),
  notas: z.string().default('')
})

export type AdminUserInputParsed = z.infer<typeof adminUserInputSchema>
