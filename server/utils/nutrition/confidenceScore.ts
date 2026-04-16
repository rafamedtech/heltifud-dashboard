import type { NutritionSource } from '~~/prisma/generated/client/enums'
import type { ExternalNutritionCandidate } from '~~/server/services/nutrition/types'
import { tokenizeNutritionText } from './normalizeText'

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function roundTo(value: number, decimals = 4) {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

export function computeNameSimilarity(left: string, right: string) {
  const leftTokenList = tokenizeNutritionText(left)
  const rightTokenList = tokenizeNutritionText(right)
  const leftTokens = new Set(leftTokenList)
  const rightTokens = new Set(rightTokenList)

  if (!leftTokens.size || !rightTokens.size) {
    return 0
  }

  const leftJoined = [...leftTokens].join(' ')
  const rightJoined = [...rightTokens].join(' ')

  if (leftJoined === rightJoined) {
    return 1
  }

  if (leftTokenList.length === 1 && rightTokenList.length > 1 && rightTokens.has(leftTokenList[0]!)) {
    return 0.55
  }

  if (rightTokenList.length === 1 && leftTokenList.length > 1 && leftTokens.has(rightTokenList[0]!)) {
    return 0.55
  }

  if (leftJoined.startsWith(rightJoined) || rightJoined.startsWith(leftJoined)) {
    return 0.75
  }

  const union = new Set([...leftTokens, ...rightTokens])
  let intersection = 0

  for (const token of leftTokens) {
    if (rightTokens.has(token)) {
      intersection += 1
    }
  }

  const jaccard = intersection / union.size
  const containment = intersection / Math.max(1, Math.min(leftTokens.size, rightTokens.size))

  return roundTo(jaccard * 0.65 + containment * 0.35, 4)
}

export function computeNutritionCompleteness(candidate: ExternalNutritionCandidate) {
  const metrics = [
    candidate.metrics.calories,
    candidate.metrics.protein,
    candidate.metrics.carbs,
    candidate.metrics.fat,
    candidate.metrics.fiber,
    candidate.metrics.sugar,
    candidate.metrics.sodium,
  ]

  const populated = metrics.filter(value => value !== null && value !== undefined).length
  return populated / metrics.length
}

export function computeNutritionConfidence(input: {
  providerScore: number
  similarity: number
  completeness: number
  source: NutritionSource
  candidate: ExternalNutritionCandidate
  normalizedQuery: string
  normalizedName: string
}) {
  let confidence = input.providerScore * 0.45
    + input.similarity * 0.4
    + input.completeness * 0.15

  if (input.normalizedQuery === input.normalizedName) {
    confidence += 0.08
  }

  if (input.source === 'USDA') {
    confidence += 0.03
  }

  if (input.candidate.brandName) {
    confidence -= 0.08
  }

  const queryTokens = tokenizeNutritionText(input.normalizedQuery)
  const nameTokens = tokenizeNutritionText(input.normalizedName)

  if (queryTokens.length === 1 && nameTokens.length > 1 && nameTokens.includes(queryTokens[0]!)) {
    confidence -= 0.18
  }

  if (queryTokens.length > 0 && nameTokens.length > queryTokens.length + 2) {
    confidence -= 0.06
  }

  if (input.candidate.metrics.calories !== null) {
    confidence += 0.015
  }

  if (!input.candidate.metrics.basisAmount || !input.candidate.metrics.basisUnit) {
    confidence -= 0.04
  }

  return clamp(roundTo(confidence, 4))
}
