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

export type DayOfWeek = (typeof DAY_OF_WEEK_VALUES)[number]
export type SlotKey = (typeof SLOT_KEYS)[number]

export interface WeeklyPlan {
  id: number
  title: string
  price: number
  description: string
  image: string
  variants: {
    title: string
    price: string
  }[]
  button: {
    label: string
    icon: string
  }
}

export interface FoodItemDetail {
  catalogItemId?: string | null
  nombre: string
  descripcion: string
  calorias: number
  imagen: string
  tipo: string
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
}

export type FoodCatalogItemInput = Omit<FoodItemDetail, 'catalogItemId'>

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
  startDate: string
  endDate: string
  name: string
  days: DayMenu[]
}

export interface WeeklyMenuInput {
  name: string
  startDate: string | Date
  endDate: string | Date
  days: DayMenu[]
}
