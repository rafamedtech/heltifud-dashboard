import { createError } from 'h3'

import { planInputSchema } from '~~/types/menuSchema'
import type { PlanDetail, PlanInput, PlanSummary } from '~~/types/types'

import { prisma } from './prisma'

type DecimalLike = { toNumber: () => number } | number | null | undefined

type PlanRecord = {
  id: string
  createdAt: Date
  updatedAt: Date
  nombre: string
  slug: string | null
  precio: DecimalLike
  dishCount: number
  tipo: PlanSummary['tipo']
  tags: string[]
  isActive: boolean
  notas: string
  _count: {
    orderItems: number
  }
}

function trimString(value: string | null | undefined) {
  return (value ?? '').trim()
}

function normalizeTags(tags: string[] | undefined) {
  const unique = new Set<string>()

  for (const tag of tags ?? []) {
    const trimmed = trimString(tag)
    if (trimmed) {
      unique.add(trimmed)
    }
  }

  return Array.from(unique)
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-MX')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function toNumber(value: DecimalLike): number {
  if (value === null || value === undefined) {
    return 0
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber()
  }

  return Number(value)
}

function mapPlan(plan: PlanRecord): PlanDetail {
  return {
    id: plan.id,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    nombre: plan.nombre,
    slug: plan.slug,
    precio: toNumber(plan.precio),
    dishCount: plan.dishCount,
    tipo: plan.tipo,
    tags: plan.tags,
    isActive: plan.isActive,
    notas: plan.notas,
    ordersCount: plan._count.orderItems
  }
}

function validatePlanInput(input: PlanInput) {
  const parsed = planInputSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Payload inválido para plan.',
      data: {
        message: 'Payload inválido para plan.',
        ...parsed.error.flatten()
      }
    })
  }

  const slugSource = trimString(parsed.data.slug) || parsed.data.nombre
  const normalizedSlug = slugify(slugSource)

  return {
    nombre: trimString(parsed.data.nombre),
    slug: normalizedSlug || null,
    precio: parsed.data.precio,
    dishCount: parsed.data.dishCount,
    tipo: parsed.data.tipo,
    tags: normalizeTags(parsed.data.tags),
    isActive: parsed.data.isActive,
    notas: trimString(parsed.data.notas)
  }
}

async function assertSlugAvailable(slug: string | null, excludeId?: string) {
  if (!slug) {
    return
  }

  const existing = await prisma.plan.findUnique({
    where: { slug },
    select: { id: true }
  })

  if (existing && existing.id !== excludeId) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un plan con ese slug.',
      data: {
        message: 'Ya existe un plan con ese slug.'
      }
    })
  }
}

const planSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  nombre: true,
  slug: true,
  precio: true,
  dishCount: true,
  tipo: true,
  tags: true,
  isActive: true,
  notas: true,
  _count: {
    select: {
      orderItems: true
    }
  }
} as const

export async function getAllPlans() {
  const plans = await prisma.plan.findMany({
    orderBy: [
      { tipo: 'asc' },
      { isActive: 'desc' },
      { dishCount: 'desc' },
      { updatedAt: 'desc' }
    ],
    select: planSelect
  })

  return plans.map(plan => mapPlan(plan as PlanRecord))
}

export async function getPlanById(id: string) {
  const plan = await prisma.plan.findUnique({
    where: { id },
    select: planSelect
  })

  return plan ? mapPlan(plan as PlanRecord) : null
}

export async function createPlan(input: PlanInput) {
  const data = validatePlanInput(input)
  await assertSlugAvailable(data.slug)

  const created = await prisma.plan.create({
    data,
    select: planSelect
  })

  return mapPlan(created as PlanRecord)
}

export async function updatePlan(id: string, input: PlanInput) {
  const existing = await prisma.plan.findUnique({
    where: { id },
    select: { id: true }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Plan no encontrado.' })
  }

  const data = validatePlanInput(input)
  await assertSlugAvailable(data.slug, id)

  const updated = await prisma.plan.update({
    where: { id },
    data,
    select: planSelect
  })

  return mapPlan(updated as PlanRecord)
}

export async function deletePlan(id: string) {
  const existing = await prisma.plan.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      _count: {
        select: {
          orderItems: true
        }
      }
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Plan no encontrado.' })
  }

  if (existing._count.orderItems > 0) {
    throw createError({
      statusCode: 409,
      message: 'No se puede eliminar el plan porque ya está vinculado a pedidos.',
      data: {
        message: 'No se puede eliminar el plan porque ya está vinculado a pedidos.',
        code: 'PLAN_IN_USE',
        orderItemsCount: existing._count.orderItems,
        planName: existing.nombre
      }
    })
  }

  await prisma.plan.delete({
    where: { id }
  })

  return { id }
}
