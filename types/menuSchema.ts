import { z } from 'zod'

import {
  DAY_OF_WEEK_VALUES,
  MENU_SLOT_TYPE_VALUES,
  MEASUREMENT_UNIT_VALUES,
  ORDER_PAYMENT_STATUS_VALUES,
  ORDER_STATUS_VALUES,
  PLAN_TYPE_VALUES,
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
const planTypeSchema = z.enum(PLAN_TYPE_VALUES)
const recipeStatusSchema = z.enum(RECIPE_STATUS_VALUES)
const uuidSchema = z.string().uuid()

export const planInputSchema = z.object({
  nombre: z.string().trim().min(2, 'El nombre del plan es obligatorio'),
  slug: z.string().trim().nullable().optional(),
  precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  dishCount: z.number().int().min(0, 'La cantidad de platillos no puede ser negativa'),
  tipo: planTypeSchema,
  tags: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
  notas: z.string().default('')
})

export type PlanInputParsed = z.infer<typeof planInputSchema>

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

const optionalDateSchema = z.union([z.string(), z.date()]).nullable().optional()

const orderLineItemInputSchema = z.object({
  planId: uuidSchema,
  quantity: z.number().int().positive('La cantidad debe ser mayor a 0'),
  notas: z.string().default(''),
  slots: z.array(z.object({
    sourceWeeklyMenuId: uuidSchema.nullable().optional(),
    sourceMenuDayId: uuidSchema.nullable().optional(),
    sourceDaySlotId: uuidSchema.nullable().optional(),
    selectionIndex: z.number().int().positive('Cada selección debe tener un índice válido.'),
    dayOfWeek: z.enum(DAY_OF_WEEK_VALUES),
    menuDayOrder: z.number().int().min(1, 'El orden del día debe ser mayor a 0.'),
    slotType: z.enum(MENU_SLOT_TYPE_VALUES),
    contenedor: z.string().trim().min(1, 'Selecciona un contenedor.'),
    platilloPrincipal: foodItemSchema.extend({
      sourceFoodComponentId: uuidSchema.nullable().optional()
    }),
    guarnicion1: foodItemSchema.extend({
      sourceFoodComponentId: uuidSchema.nullable().optional()
    }).nullable().optional(),
    guarnicion2: foodItemSchema.extend({
      sourceFoodComponentId: uuidSchema.nullable().optional()
    }).nullable().optional(),
    adicionales: z.array(foodItemSchema.extend({
      sourceFoodComponentId: uuidSchema.nullable().optional()
    })).default([])
  }).superRefine((slot, ctx) => {
    if (!slot.platilloPrincipal.catalogItemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['platilloPrincipal'],
        message: 'Selecciona un platillo principal.'
      })
    }
  })).default([])
}).superRefine((value, ctx) => {
  const seenSelectionIndexes = new Set<number>()

  value.slots.forEach((slot, index) => {
    if (seenSelectionIndexes.has(slot.selectionIndex)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['slots', index, 'selectionIndex'],
        message: 'Cada selección debe ser única dentro del plan.'
      })
      return
    }

    seenSelectionIndexes.add(slot.selectionIndex)
  })
})

const orderDeliveryAddressInputSchema = z.object({
  etiqueta: z.string().default(''),
  destinatario: z.string().trim().min(1, 'El destinatario es obligatorio'),
  telefono: z.string().default(''),
  linea1: z.string().trim().min(1, 'La línea principal es obligatoria'),
  linea2: z.string().default(''),
  colonia: z.string().default(''),
  ciudad: z.string().trim().min(1, 'La ciudad es obligatoria'),
  estado: z.string().trim().min(1, 'El estado es obligatorio'),
  codigoPostal: z.string().default(''),
  pais: z.string().default('MX'),
  referencias: z.string().default(''),
  makeDefault: z.boolean().default(false)
})

export const orderInputSchema = z.object({
  userId: uuidSchema,
  weeklyMenuId: uuidSchema.nullable().optional(),
  deliveryAddressId: uuidSchema.nullable().optional(),
  deliveryAddress: orderDeliveryAddressInputSchema.nullable().optional(),
  status: z.enum(ORDER_STATUS_VALUES),
  paymentStatus: z.enum(ORDER_PAYMENT_STATUS_VALUES),
  currency: z.string().trim().min(3, 'La moneda es obligatoria').max(3, 'La moneda debe tener 3 caracteres'),
  descuento: z.number().min(0, 'El descuento no puede ser negativo').nullable().optional(),
  extras: z.number().min(0, 'Los extras no pueden ser negativos').nullable().optional(),
  costoEnvio: z.number().min(0, 'El costo de envío no puede ser negativo').nullable().optional(),
  scheduledFor: optionalDateSchema,
  firstDeliveryAt: optionalDateSchema,
  secondDeliveryAt: optionalDateSchema,
  tags: z.array(z.string().trim().min(1)).default([]),
  notas: z.string().default(''),
  notasInternas: z.string().default(''),
  planItems: z.array(orderLineItemInputSchema).min(1, 'Agrega al menos un plan al pedido')
}).superRefine((value, ctx) => {
  const seenPlanIds = new Set<string>()

  value.planItems.forEach((item, index) => {
    if (seenPlanIds.has(item.planId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['planItems', index, 'planId'],
        message: 'Este plan ya está agregado al pedido.'
      })
      return
    }

    seenPlanIds.add(item.planId)
  })

  if (value.deliveryAddressId && value.deliveryAddress) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['deliveryAddressId'],
      message: 'Selecciona una dirección existente o captura una nueva, pero no ambas.'
    })
  }

  if (value.secondDeliveryAt && !value.firstDeliveryAt) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['firstDeliveryAt'],
      message: 'Captura la primera entrega antes de la segunda.'
    })
  }
})

export type OrderInputParsed = z.infer<typeof orderInputSchema>
