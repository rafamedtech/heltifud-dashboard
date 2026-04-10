import { format } from 'date-fns'
import { es } from 'date-fns/locale'

function toDate(value: Date | string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value: Date | string, pattern = 'd MMM yyyy') {
  const date = toDate(value)
  if (!date) {
    return 'Fecha pendiente'
  }

  return format(date, pattern, { locale: es })
}

export function formatDateTime(value: Date | string) {
  return formatDate(value, 'd MMM yyyy, HH:mm')
}

export function formatWeekRange(startDate: Date | string, endDate: Date | string) {
  if (!toDate(startDate) || !toDate(endDate)) {
    return 'Rango pendiente'
  }

  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

export function formatCalories(value: number) {
  return new Intl.NumberFormat('es-MX').format(value)
}
