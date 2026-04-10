import type {
  DayMenu,
  DayOfWeek,
  FoodCatalogItem,
  FoodItemDetail,
  MenuSlot,
  SlotKey,
  WeeklyMenu,
  WeeklyMenuInput
} from '~~/types/types'

export interface WeeklyMenuFormState extends Omit<WeeklyMenuInput, 'startDate' | 'endDate'> {
  startDate: string
  endDate: string
}

export const DAY_LABELS: Record<DayOfWeek, string> = {
  LUNES: 'Lunes',
  MARTES: 'Martes',
  MIERCOLES: 'Miércoles',
  JUEVES: 'Jueves',
  VIERNES: 'Viernes',
  SABADO: 'Sábado',
  DOMINGO: 'Domingo'
}

export const SLOT_LABELS: Record<SlotKey, string> = {
  desayuno: 'Desayuno',
  comida: 'Comida',
  cena: 'Cena',
  snack1: 'Snack 1',
  snack2: 'Snack 2'
}

export const DAY_ORDER: DayOfWeek[] = [
  'LUNES',
  'MARTES',
  'MIERCOLES',
  'JUEVES',
  'VIERNES',
  'SABADO',
  'DOMINGO'
]

export const SLOT_ORDER: SlotKey[] = ['desayuno', 'comida', 'cena', 'snack1', 'snack2']

export function createEmptyFoodItem(): FoodItemDetail {
  return {
    catalogItemId: null,
    nombre: '',
    descripcion: '',
    calorias: 0,
    imagen: '',
    tipo: ''
  }
}

export function createFoodItemFromCatalog(item?: FoodCatalogItem | null): FoodItemDetail {
  if (!item) {
    return createEmptyFoodItem()
  }

  return {
    catalogItemId: item.id,
    nombre: item.nombre,
    descripcion: item.descripcion,
    calorias: item.calorias,
    imagen: item.imagen,
    tipo: item.tipo
  }
}

export function createEmptySlot(): MenuSlot {
  return {
    platilloPrincipal: createEmptyFoodItem(),
    guarnicion1: null,
    guarnicion2: null,
    contenedor: '',
    adicionales: []
  }
}

export function createEmptyDayMenu(dayOfWeek: DayOfWeek): DayMenu {
  return {
    dayOfWeek,
    desayuno: createEmptySlot(),
    comida: createEmptySlot(),
    cena: createEmptySlot(),
    snack1: createEmptySlot(),
    snack2: createEmptySlot()
  }
}

export function createEmptyWeeklyMenuFormState(): WeeklyMenuFormState {
  const today = new Date()
  const nextWeek = new Date(today)
  nextWeek.setDate(today.getDate() + 6)

  return {
    name: '',
    startDate: toDateInputValue(today),
    endDate: toDateInputValue(nextWeek),
    days: DAY_ORDER.map(day => createEmptyDayMenu(day))
  }
}

export function cloneFoodItem(item?: FoodItemDetail | null): FoodItemDetail | null {
  if (!item) {
    return null
  }

  return {
    catalogItemId: item.catalogItemId ?? null,
    nombre: item.nombre,
    descripcion: item.descripcion,
    calorias: item.calorias,
    imagen: item.imagen,
    tipo: item.tipo
  }
}

export function cloneSlot(slot: MenuSlot): MenuSlot {
  return {
    platilloPrincipal: cloneFoodItem(slot.platilloPrincipal) ?? createEmptyFoodItem(),
    guarnicion1: cloneFoodItem(slot.guarnicion1),
    guarnicion2: cloneFoodItem(slot.guarnicion2),
    contenedor: slot.contenedor ?? '',
    adicionales: slot.adicionales.map(item => cloneFoodItem(item) ?? createEmptyFoodItem())
  }
}

export function createMenuFormState(menu?: WeeklyMenu | null): WeeklyMenuFormState {
  if (!menu) {
    return createEmptyWeeklyMenuFormState()
  }

  return {
    name: menu.name,
    startDate: toDateInputValue(menu.startDate),
    endDate: toDateInputValue(menu.endDate),
    days: DAY_ORDER.map((dayOfWeek) => {
      const day = menu.days.find(entry => entry.dayOfWeek === dayOfWeek) ?? createEmptyDayMenu(dayOfWeek)

      return {
        dayOfWeek,
        desayuno: cloneSlot(day.desayuno),
        comida: cloneSlot(day.comida),
        cena: cloneSlot(day.cena),
        snack1: cloneSlot(day.snack1),
        snack2: cloneSlot(day.snack2)
      }
    })
  }
}

export function toDateInputValue(value: Date | string) {
  return new Date(value).toISOString().slice(0, 10)
}
