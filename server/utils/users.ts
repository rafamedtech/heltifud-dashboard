import { createError } from 'h3'

import { adminUserInputSchema } from '~~/types/menuSchema'
import type {
  AdminUserDetail,
  AdminUserInput,
  AdminUserSummary
} from '~~/types/types'

import { prisma } from './prisma'

type DecimalLike = { toNumber: () => number } | number | null | undefined

type AdminUserRecord = {
  id: string
  createdAt: Date
  updatedAt: Date
  authUserId: string | null
  email: string
  nombre: string
  apellidos: string
  telefono: string | null
  role: AdminUserSummary['role']
  status: AdminUserSummary['status']
  source: AdminUserDetail['source']
  gender: AdminUserDetail['gender']
  customerType: AdminUserSummary['customerType']
  tags: string[]
  primaryAddress: string
  primaryAddress2: string
  notas: string
  ordersCountCached: number
  lastOrderAt: Date | null
  totalSpentCached: DecimalLike
}

export function toNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber()
  }

  return Number(value)
}

function trimString(value: string | null | undefined) {
  return (value ?? '').trim()
}

function trimNullableString(value: string | null | undefined) {
  const trimmed = trimString(value)
  return trimmed.length > 0 ? trimmed : null
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

function mapAdminUserSummary(user: AdminUserRecord): AdminUserSummary {
  return {
    id: user.id,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    email: user.email,
    nombre: user.nombre,
    apellidos: user.apellidos,
    telefono: user.telefono,
    role: user.role,
    status: user.status,
    customerType: user.customerType,
    ordersCountCached: user.ordersCountCached,
    lastOrderAt: user.lastOrderAt?.toISOString() ?? null,
    totalSpentCached: toNumber(user.totalSpentCached)
  }
}

function mapAdminUserDetail(user: AdminUserRecord): AdminUserDetail {
  return {
    ...mapAdminUserSummary(user),
    authUserId: user.authUserId,
    source: user.source,
    gender: user.gender,
    tags: user.tags,
    primaryAddress: user.primaryAddress,
    primaryAddress2: user.primaryAddress2,
    notas: user.notas
  }
}

function validateAdminUserInput(input: AdminUserInput) {
  const parsed = adminUserInputSchema.safeParse(input)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: 'Payload inválido para usuario.',
      data: {
        message: 'Payload inválido para usuario.',
        ...parsed.error.flatten()
      }
    })
  }

  return {
    email: parsed.data.email.trim().toLocaleLowerCase('es-MX'),
    nombre: trimString(parsed.data.nombre),
    apellidos: trimString(parsed.data.apellidos),
    telefono: trimNullableString(parsed.data.telefono),
    role: parsed.data.role,
    status: parsed.data.status,
    source: parsed.data.source ?? null,
    gender: parsed.data.gender ?? null,
    customerType: parsed.data.customerType ?? null,
    tags: normalizeTags(parsed.data.tags),
    primaryAddress: trimString(parsed.data.primaryAddress),
    primaryAddress2: trimString(parsed.data.primaryAddress2),
    notas: trimString(parsed.data.notas)
  }
}

const adminUserSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  authUserId: true,
  email: true,
  nombre: true,
  apellidos: true,
  telefono: true,
  role: true,
  status: true,
  source: true,
  gender: true,
  customerType: true,
  tags: true,
  primaryAddress: true,
  primaryAddress2: true,
  notas: true,
  ordersCountCached: true,
  lastOrderAt: true,
  totalSpentCached: true
} as const

export async function getAdminUsers() {
  const users = await prisma.user.findMany({
    select: adminUserSelect,
    orderBy: [
      { nombre: 'asc' },
      { apellidos: 'asc' },
      { email: 'asc' }
    ]
  })

  return users.map(mapAdminUserSummary)
}

export async function getAdminUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: adminUserSelect
  })

  return user ? mapAdminUserDetail(user) : null
}

export async function createAdminUser(input: AdminUserInput) {
  const data = validateAdminUserInput(input)

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true }
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un usuario con ese correo.',
      data: {
        message: 'Ya existe un usuario con ese correo.'
      }
    })
  }

  const created = await prisma.user.create({
    data,
    select: adminUserSelect
  })

  return mapAdminUserDetail(created)
}

export async function updateAdminUser(id: string, input: AdminUserInput) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true
    }
  })

  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Usuario no encontrado.' })
  }

  const data = validateAdminUserInput(input)

  const conflict = await prisma.user.findUnique({
    where: { email: data.email },
    select: { id: true }
  })

  if (conflict && conflict.id !== id) {
    throw createError({
      statusCode: 409,
      message: 'Ya existe un usuario con ese correo.',
      data: {
        message: 'Ya existe un usuario con ese correo.'
      }
    })
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: adminUserSelect
  })

  return mapAdminUserDetail(updated)
}
