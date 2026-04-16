export function normalizeNutritionText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeNutritionText(value: string | null | undefined) {
  return normalizeNutritionText(value)
    .split(' ')
    .map(token => token.trim())
    .filter(Boolean)
}
