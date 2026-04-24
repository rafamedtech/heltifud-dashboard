export const DAY_OF_WEEK_VALUES = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO'
] as const

export const SLOT_KEYS = ['desayuno', 'comida', 'cena', 'snack1', 'snack2'] as const
export const MENU_SLOT_TYPE_VALUES = ['DESAYUNO', 'COMIDA', 'CENA', 'SNACK1', 'SNACK2'] as const
export const PLAN_TYPE_VALUES = ['DESAYUNO', 'COMIDA', 'CENA'] as const
export const MENU_TYPE_VALUES = ['ESTANDAR', 'VEGETARIANO'] as const
export const RECIPE_STATUS_VALUES = ['BORRADOR', 'ACTIVA', 'ARCHIVADA'] as const
export const USER_ROLE_VALUES = ['ADMIN', 'CLIENTE'] as const
export const USER_STATUS_VALUES = ['ACTIVO', 'PAUSADO', 'INACTIVO', 'BLOQUEADO'] as const
export const ORDER_STATUS_VALUES = ['BORRADOR', 'INGRESADO', 'CONFIRMADO', 'PAGADO', 'EMPACADO', 'EMPACADO_POR_PAGAR', 'PROGRAMADO', 'EN_RUTA', 'ENTREGADO', 'ENTREGADO_POR_PAGAR', 'COMPLETADO', 'COMPLETADO_POR_PAGAR', 'CANCELADO'] as const
export const ORDER_PAYMENT_STATUS_VALUES = ['PENDIENTE', 'PAGADO', 'FALLIDO', 'REEMBOLSADO'] as const
export const ORDER_PLAN_RESOLUTION_STATUS_VALUES = ['PENDIENTE', 'PARCIAL', 'COMPLETO'] as const
export const USER_CUSTOMER_TYPE_VALUES = ['VEGETARIANO', 'NUTRIOLOGO', 'ESTANDAR'] as const
export const USER_SOURCE_VALUES = ['ORGANICO', 'ADS', 'REFERIDO', 'OTRO'] as const
export const USER_GENDER_VALUES = ['MUJER', 'HOMBRE', 'OTRO', 'PREFIERE_NO_DECIR'] as const
export const MEASUREMENT_UNIT_VALUES = [
  'GRAMO',
  'KILOGRAMO',
  'MILILITRO',
  'LITRO',
  'PIEZA',
  'TAZA',
  'CUCHARADA',
  'CUCHARADITA',
  'ONZA',
  'LIBRA',
  'PAQUETE',
  'LATA',
  'BOTELLA',
  'PORCION'
] as const

export type DayOfWeek = (typeof DAY_OF_WEEK_VALUES)[number]
export type SlotKey = (typeof SLOT_KEYS)[number]
export type MenuSlotType = (typeof MENU_SLOT_TYPE_VALUES)[number]
export type PlanType = (typeof PLAN_TYPE_VALUES)[number]
export type MenuType = (typeof MENU_TYPE_VALUES)[number]
export type RecipeStatus = (typeof RECIPE_STATUS_VALUES)[number]
export type UserRole = (typeof USER_ROLE_VALUES)[number]
export type UserStatus = (typeof USER_STATUS_VALUES)[number]
export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number]
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUS_VALUES)[number]
export type OrderPlanResolutionStatus = (typeof ORDER_PLAN_RESOLUTION_STATUS_VALUES)[number]
export type UserCustomerType = (typeof USER_CUSTOMER_TYPE_VALUES)[number]
export type UserSource = (typeof USER_SOURCE_VALUES)[number]
export type UserGender = (typeof USER_GENDER_VALUES)[number]
export type MeasurementUnit = (typeof MEASUREMENT_UNIT_VALUES)[number]

export interface PlanSummary {
  id: string
  createdAt: string
  updatedAt: string
  nombre: string
  slug: string | null
  precio: number
  dishCount: number
  tipo: PlanType
  tags: string[]
  isActive: boolean
  notas: string
  ordersCount: number
}

export type PlanDetail = PlanSummary

export interface PlanInput {
  nombre: string
  slug?: string | null
  precio: number
  dishCount: number
  tipo: PlanType
  tags: string[]
  isActive: boolean
  notas: string
}

export interface FoodItemDetail {
  catalogItemId?: string | null
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
}

export interface SupplyCategorySummary {
  id: string
  createdAt: string
  updatedAt: string
  nombre: string
  slug: string
  descripcion: string
  isActive: boolean
  sortOrder: number
}

export interface SupplyCategoryInput {
  nombre: string
  descripcion: string
  isActive: boolean
  sortOrder: number
}

export interface SupplyItemSummary {
  id: string
  createdAt: string
  updatedAt: string
  nombre: string
  descripcion: string
  codigo: string | null
  unidadBase: MeasurementUnit
  nutritionBasis?: 'POR_100_GRAMOS' | 'POR_100_MILILITROS' | 'POR_PORCION' | 'POR_UNIDAD' | null
  defaultServingSize?: number | null
  defaultServingUnit?: MeasurementUnit | null
  densidad?: number | null
  calorias?: number | null
  proteina?: number | null
  carbohidratos?: number | null
  grasas?: number | null
  fibra?: number | null
  azucar?: number | null
  sodio?: number | null
  tags: string[]
  isActive: boolean
  costoReferencial: number | null
  mermaPorcentaje: number | null
  category: SupplyCategorySummary | null
}

export interface SupplyItemInput {
  nombre: string
  descripcion: string
  codigo?: string | null
  unidadBase: MeasurementUnit
  tags: string[]
  isActive: boolean
  costoReferencial?: number | null
  mermaPorcentaje?: number | null
  categoryId?: string | null
}

export interface RecipeIngredient {
  id: string
  orden: number
  grupo: string | null
  cantidad: number
  unidad: MeasurementUnit
  notas: string
  opcional: boolean
  supplyItem: SupplyItemSummary
}

export interface RecipeDetail {
  id: string
  status: RecipeStatus
  version: number
  porciones: number | null
  rendimientoCantidad: number | null
  rendimientoUnidad: MeasurementUnit | null
  tiempoPreparacionMin: number | null
  tiempoCoccionMin: number | null
  instrucciones: string
  notas: string
  ingredients: RecipeIngredient[]
}

export interface RecipeIngredientInput {
  supplyName: string
  supplyDescription: string
  supplyCode?: string | null
  supplyUnitBase: MeasurementUnit
  supplyCategoryName?: string | null
  supplyTags: string[]
  supplyCostoReferencial?: number | null
  supplyMermaPorcentaje?: number | null
  supplyCalorias?: number | null
  supplyProteina?: number | null
  supplyCarbohidratos?: number | null
  supplyGrasas?: number | null
  supplyFibra?: number | null
  supplyAzucar?: number | null
  supplySodio?: number | null
  supplyNutritionBasis?: 'POR_100_GRAMOS' | 'POR_100_MILILITROS' | 'POR_PORCION' | 'POR_UNIDAD' | null
  supplyDefaultServingSize?: number | null
  supplyDefaultServingUnit?: MeasurementUnit | null
  supplyDensidad?: number | null
  grupo?: string | null
  cantidad: number
  unidad: MeasurementUnit
  notas: string
  opcional: boolean
}

export interface RecipeInput {
  status?: RecipeStatus
  porciones?: number | null
  rendimientoCantidad?: number | null
  rendimientoUnidad?: MeasurementUnit | null
  tiempoPreparacionMin?: number | null
  tiempoCoccionMin?: number | null
  instrucciones: string
  notas: string
  ingredients: RecipeIngredientInput[]
}

export interface FoodCatalogItem extends Omit<FoodItemDetail, 'catalogItemId'> {
  id: string
  createdAt: string
  updatedAt: string
}

export interface LinkedMenuSummary {
  id: string
  name: string
}

export interface FoodCatalogItemDetail extends FoodCatalogItem {
  linkedMenus: LinkedMenuSummary[]
  recipe?: RecipeDetail | null
}

export interface FoodCatalogItemInput extends Omit<FoodItemDetail, 'catalogItemId'> {
  recipe?: RecipeInput | null
}

export interface MenuSlot {
  platilloPrincipal: FoodItemDetail
  guarnicion1?: FoodItemDetail | null
  guarnicion2?: FoodItemDetail | null
  contenedor?: string | null
  adicionales: FoodItemDetail[]
}

export interface DayMenu {
  dayOfWeek: DayOfWeek
  desayuno: MenuSlot
  comida: MenuSlot
  cena: MenuSlot
  snack1: MenuSlot
  snack2: MenuSlot
}

export interface WeeklyMenu {
  id: string
  createdAt: string
  updatedAt: string
  isActive: boolean
  menuType: MenuType
  startDate: string
  endDate: string
  name: string
  days: DayMenu[]
}

export interface DetailedFoodItem extends FoodItemDetail {
  sourceFoodComponentId?: string | null
}

export interface DetailedMenuSlot extends Omit<MenuSlot, 'platilloPrincipal' | 'guarnicion1' | 'guarnicion2' | 'adicionales'> {
  sourceDaySlotId?: string | null
  platilloPrincipal: DetailedFoodItem
  guarnicion1?: DetailedFoodItem | null
  guarnicion2?: DetailedFoodItem | null
  adicionales: DetailedFoodItem[]
}

export interface DetailedDayMenu extends Omit<DayMenu, 'desayuno' | 'comida' | 'cena' | 'snack1' | 'snack2'> {
  sourceMenuDayId?: string | null
  menuDayOrder?: number | null
  desayuno: DetailedMenuSlot
  comida: DetailedMenuSlot
  cena: DetailedMenuSlot
  snack1: DetailedMenuSlot
  snack2: DetailedMenuSlot
}

export interface WeeklyMenuDetail extends Omit<WeeklyMenu, 'days'> {
  days: DetailedDayMenu[]
}

export interface WeeklyMenuInput {
  name: string
  menuType?: MenuType
  startDate: string | Date
  endDate: string | Date
  days: DayMenu[]
}

export interface AdminUserSummary {
  id: string
  createdAt: string
  updatedAt: string
  email: string
  nombre: string
  apellidos: string
  telefono: string | null
  role: UserRole
  status: UserStatus
  customerType: UserCustomerType | null
  ordersCountCached: number
  lastOrderAt: string | null
  totalSpentCached: number | null
}

export interface AdminUserInput {
  email: string
  nombre: string
  apellidos: string
  telefono?: string | null
  role: UserRole
  status: UserStatus
  source?: UserSource | null
  gender?: UserGender | null
  customerType?: UserCustomerType | null
  tags: string[]
  primaryAddress: string
  primaryAddress2: string
  notas: string
}

export interface AdminUserDetail extends AdminUserSummary {
  authUserId: string | null
  source: UserSource | null
  gender: UserGender | null
  tags: string[]
  primaryAddress: string
  primaryAddress2: string
  notas: string
}

export interface SessionAppUser {
  id: string | null
  authUserId: string | null
  email: string
  role: UserRole | null
  isAdmin: boolean
}

export interface AdminOrderAddressSummary {
  id: string
  etiqueta: string
  destinatario: string
  telefono: string
  linea1: string
  linea2: string
  colonia: string
  ciudad: string
  estado: string
  codigoPostal: string
  referencias: string
  isDefault: boolean
  summary: string
}

export interface AdminOrderFormUserSummary {
  id: string
  email: string
  nombre: string
  apellidos: string
  telefono: string | null
  customerType: UserCustomerType | null
  primaryAddress: string
  primaryAddress2: string
  addresses: AdminOrderAddressSummary[]
}

export interface AdminOrderFormMenuSummary {
  id: string
  name: string
  menuType: MenuType
  isActive: boolean
  startDate: string
  endDate: string
}

export interface AdminOrderLineItemInput {
  planId: string
  quantity: number
  notas: string
  slots?: AdminOrderPlanSlotInput[]
}

export interface AdminOrderEditableFoodItem extends FoodItemDetail {
  sourceFoodComponentId?: string | null
}

export interface AdminOrderEditableSlot {
  platilloPrincipal: AdminOrderEditableFoodItem
  guarnicion1?: AdminOrderEditableFoodItem | null
  guarnicion2?: AdminOrderEditableFoodItem | null
  contenedor?: string | null
  adicionales: AdminOrderEditableFoodItem[]
}

export interface AdminOrderPlanEditorSlotState {
  sourceWeeklyMenuId?: string | null
  sourceMenuDayId?: string | null
  sourceDaySlotId?: string | null
  selectionIndex: number
  dayOfWeek: DayOfWeek
  menuDayOrder: number
  slotType: MenuSlotType
  slot: AdminOrderEditableSlot
}

export interface AdminOrderPlanSlotInput {
  sourceWeeklyMenuId?: string | null
  sourceMenuDayId?: string | null
  sourceDaySlotId?: string | null
  selectionIndex: number
  dayOfWeek: DayOfWeek
  menuDayOrder: number
  slotType: MenuSlotType
  contenedor: string
  platilloPrincipal: AdminOrderEditableFoodItem
  guarnicion1?: AdminOrderEditableFoodItem | null
  guarnicion2?: AdminOrderEditableFoodItem | null
  adicionales: AdminOrderEditableFoodItem[]
}

export interface AdminOrderDeliveryAddressInput {
  etiqueta: string
  destinatario: string
  telefono: string
  linea1: string
  linea2?: string
  colonia?: string
  ciudad: string
  estado: string
  codigoPostal?: string
  pais?: string
  referencias?: string
  makeDefault?: boolean
}

export interface AdminOrderInput {
  userId: string
  weeklyMenuId?: string | null
  deliveryAddressId?: string | null
  deliveryAddress?: AdminOrderDeliveryAddressInput | null
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  currency: string
  descuento?: number | null
  extras?: number | null
  costoEnvio?: number | null
  scheduledFor?: string | Date | null
  firstDeliveryAt?: string | Date | null
  secondDeliveryAt?: string | Date | null
  tags: string[]
  notas: string
  notasInternas: string
  planItems: AdminOrderLineItemInput[]
}

export interface AdminOrderFormData {
  users: AdminOrderFormUserSummary[]
  plans: PlanSummary[]
  menus: AdminOrderFormMenuSummary[]
}

export interface AdminOrderActorSummary {
  id: string
  email: string
  nombre: string
  apellidos: string
  telefono?: string | null
}

export interface AdminOrderMenuSummary {
  id: string
  name: string
  startDate: string
  endDate: string
}

export interface AdminOrderPlanSummary {
  id: string
  planId: string
  planName: string
  quantity: number
  unitPrice: number | null
  lineSubtotal: number | null
  planDishCountSnapshot: number
  planTypeSnapshot: PlanType
  requestedDishCount: number
  assignedDishCount: number
  pendingDishCount: number
  resolutionStatus: OrderPlanResolutionStatus
}

export interface AdminOrderSummary {
  id: string
  createdAt: string
  updatedAt: string
  orderNumber: string | null
  status: OrderStatus
  paymentStatus: OrderPaymentStatus
  currency: string
  subtotal: number | null
  descuento: number | null
  extras: number | null
  costoEnvio: number | null
  total: number | null
  totalPlanPriceCached: number | null
  totalDishCountCached: number
  requiredBagCountCached: number | null
  scheduledFor: string | null
  firstDeliveryAt: string | null
  secondDeliveryAt: string | null
  deliveredAt: string | null
  cancelledAt: string | null
  tags: string[]
  notas: string
  notasInternas: string
  menuNameSnapshot: string
  menuStartDateSnapshot: string | null
  menuEndDateSnapshot: string | null
  menuResolvedAt: string | null
  totalRequestedDishCount: number
  totalAssignedDishCount: number
  totalPendingDishCount: number
  deliveryAddressSummary: string | null
  user: AdminOrderActorSummary
  createdBy: AdminOrderActorSummary
  weeklyMenu: AdminOrderMenuSummary | null
  planItems: AdminOrderPlanSummary[]
}
