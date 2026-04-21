import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { Pool } from 'pg'

process.loadEnvFile?.()

const connectionString = process.env.DATABASE_URL
const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@heltifud.com'
const adminNombre = process.env.SEED_ADMIN_NOMBRE ?? 'Admin'
const adminApellidos = process.env.SEED_ADMIN_APELLIDOS ?? 'Heltifud'
const adminTelefono = process.env.SEED_ADMIN_TELEFONO ?? null
const basePlans = [
  {
    slug: 'plan-desayuno-base',
    nombre: 'Plan Desayuno Base',
    precio: '0.00',
    dishCount: 0,
    tipo: 'DESAYUNO',
    tags: [],
    notas: 'Plan semilla. Ajustar precio y cantidad de platillos desde panel.'
  },
  {
    slug: 'plan-comida-base',
    nombre: 'Plan Comida Base',
    precio: '0.00',
    dishCount: 0,
    tipo: 'COMIDA',
    tags: [],
    notas: 'Plan semilla. Ajustar precio y cantidad de platillos desde panel.'
  },
  {
    slug: 'plan-cena-base',
    nombre: 'Plan Cena Base',
    precio: '0.00',
    dishCount: 0,
    tipo: 'CENA',
    tags: [],
    notas: 'Plan semilla. Ajustar precio y cantidad de platillos desde panel.'
  }
]

if (!connectionString) {
  throw new Error('DATABASE_URL es requerido para ejecutar el seed.')
}

const seedDataDir = join(process.cwd(), 'prisma', 'seed-data')
const pool = new Pool({ connectionString })
const requiredTables = ['WeeklyMenu', 'MenuDay', 'DaySlot', 'FoodCatalogItem', 'FoodComponent', 'User', 'Plan']

function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let inQuotes = false

  for (const char of text) {
    if (char === '\r') {
      continue
    }

    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(cell)
      cell = ''
      continue
    }

    if (char === '\n' && !inQuotes) {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }

  const [headers, ...records] = rows.filter(currentRow => currentRow.length > 1 || currentRow[0]?.length)

  return records.map(record => Object.fromEntries(
    headers.map((header, index) => [header, record[index] ?? ''])
  ))
}

async function loadCsv(filename) {
  const file = await readFile(join(seedDataDir, filename), 'utf8')
  return parseCsv(file)
}

function toInt(value) {
  return Number.parseInt(value, 10)
}

function toNullable(value) {
  return value === '' ? null : value
}

function toDate(value) {
  return new Date(value.replace(' ', 'T'))
}

function chunk(items, size) {
  const chunks = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

async function insertRows(client, table, columns, rows) {
  if (!rows.length) {
    return
  }

  for (const batch of chunk(rows, 250)) {
    const values = batch.flatMap(row => columns.map(column => row[column]))
    const placeholders = batch
      .map((_row, rowIndex) => {
        const offset = rowIndex * columns.length
        return `(${columns.map((_column, columnIndex) => `$${offset + columnIndex + 1}`).join(', ')})`
      })
      .join(', ')

    await client.query(
      `INSERT INTO "${table}" (${columns.map(column => `"${column}"`).join(', ')}) VALUES ${placeholders}`,
      values
    )
  }
}

async function upsertAdminUser(client) {
  let authUserId = null

  try {
    const { rows } = await client.query(
      `
        SELECT "id"::text AS "id"
        FROM "auth"."users"
        WHERE "email" = $1
        ORDER BY "created_at" ASC
        LIMIT 1
      `,
      [adminEmail]
    )

    authUserId = rows[0]?.id ?? null
  } catch {
    console.warn(`No se pudo consultar auth.users para ${adminEmail}. Se sembrara el admin sin authUserId.`)
  }

  await client.query(
    `
      INSERT INTO "User" (
        "id",
        "createdAt",
        "updatedAt",
        "authUserId",
        "email",
        "nombre",
        "apellidos",
        "telefono",
        "role",
        "status"
      )
      VALUES (
        $1,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        $2,
        $3,
        $4,
        $5,
        $6,
        'ADMIN',
        'ACTIVO'
      )
      ON CONFLICT ("email")
      DO UPDATE SET
        "updatedAt" = CURRENT_TIMESTAMP,
        "authUserId" = COALESCE(EXCLUDED."authUserId", "User"."authUserId"),
        "nombre" = EXCLUDED."nombre",
        "apellidos" = EXCLUDED."apellidos",
        "telefono" = EXCLUDED."telefono",
        "role" = 'ADMIN',
        "status" = 'ACTIVO'
    `,
    [randomUUID(), authUserId, adminEmail, adminNombre, adminApellidos, adminTelefono]
  )
}

async function insertBasePlans(client) {
  for (const plan of basePlans) {
    await client.query(
      `
        INSERT INTO "Plan" (
          "id",
          "createdAt",
          "updatedAt",
          "nombre",
          "slug",
          "precio",
          "dishCount",
          "tipo",
          "tags",
          "isActive",
          "notas"
        )
        VALUES (
          $1,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          $2,
          $3,
          $4::decimal(10,2),
          $5,
          $6::"PlanType",
          $7::text[],
          true,
          $8
        )
        ON CONFLICT ("slug") DO NOTHING
      `,
      [randomUUID(), plan.nombre, plan.slug, plan.precio, plan.dishCount, plan.tipo, plan.tags, plan.notas]
    )
  }
}

async function ensureRequiredTables(client) {
  const { rows } = await client.query(
    `
      SELECT "table_name"
      FROM "information_schema"."tables"
      WHERE "table_schema" = CURRENT_SCHEMA()
        AND "table_name" = ANY($1::text[])
    `,
    [requiredTables]
  )

  const existingTables = new Set(rows.map(row => row.table_name))
  const missingTables = requiredTables.filter(table => !existingTables.has(table))

  if (missingTables.length) {
    throw new Error(
      `Faltan tablas en la base de datos actual (${missingTables.join(', ')}). Ejecuta primero "pnpm prisma:migrate" y luego vuelve a correr "pnpm prisma:seed".`
    )
  }
}

async function loadSeedData() {
  const [weeklyMenuRows, menuDayRows, daySlotRows, foodCatalogItemRows, foodComponentRows] = await Promise.all([
    loadCsv('WeeklyMenu_rows.csv'),
    loadCsv('MenuDay_rows.csv'),
    loadCsv('DaySlot_rows.csv'),
    loadCsv('FoodCatalogItem_rows.csv'),
    loadCsv('FoodComponent_rows.csv')
  ])
  const generatedTimestamp = new Date()

  return {
    weeklyMenus: weeklyMenuRows.map(row => ({
      id: row.id,
      name: row.name,
      isActive: row.isActive === 'true',
      startDate: toDate(row.startDate),
      endDate: toDate(row.endDate),
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt)
    })),
    menuDays: menuDayRows.map(row => ({
      id: row.id,
      weeklyMenuId: row.weeklyMenuId,
      dayOfWeek: row.dayOfWeek,
      order: toInt(row.order),
      createdAt: generatedTimestamp,
      updatedAt: generatedTimestamp
    })),
    daySlots: daySlotRows.map(row => ({
      id: row.id,
      menuDayId: row.menuDayId,
      slotType: row.slotType,
      contenedor: toNullable(row.contenedor),
      createdAt: generatedTimestamp,
      updatedAt: generatedTimestamp
    })),
    foodCatalogItems: foodCatalogItemRows.map(row => ({
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      calorias: toInt(row.calorias),
      imagen: row.imagen,
      tipo: row.tipo,
      createdAt: toDate(row.createdAt),
      updatedAt: toDate(row.updatedAt)
    })),
    foodComponents: foodComponentRows.map(row => ({
      id: row.id,
      daySlotId: row.daySlotId,
      componentRole: row.componentRole,
      nombre: row.nombre,
      descripcion: row.descripcion,
      calorias: toInt(row.calorias),
      imagen: row.imagen,
      tipo: row.tipo,
      catalogItemId: toNullable(row.catalogItemId),
      createdAt: generatedTimestamp,
      updatedAt: generatedTimestamp
    })),
    adminUser: {
      email: adminEmail,
      nombre: adminNombre,
      apellidos: adminApellidos,
      telefono: adminTelefono
    },
    basePlans
  }
}

async function main() {
  const seedData = await loadSeedData()

  if (process.argv.includes('--dry-run')) {
    console.log(
      `Dry run: ${seedData.weeklyMenus.length} menus, ${seedData.menuDays.length} dias, ${seedData.daySlots.length} slots, ${seedData.foodCatalogItems.length} items de catalogo, ${seedData.foodComponents.length} componentes, ${seedData.basePlans.length} planes base y admin ${seedData.adminUser.email} listo para upsert.`
    )
    return
  }

  const client = await pool.connect()

  try {
    await ensureRequiredTables(client)
    await client.query('BEGIN')

    await client.query('DELETE FROM "FoodComponent"')
    await client.query('DELETE FROM "DaySlot"')
    await client.query('DELETE FROM "MenuDay"')
    await client.query('DELETE FROM "WeeklyMenu"')
    await client.query('DELETE FROM "FoodCatalogItem"')

    await insertRows(
      client,
      'FoodCatalogItem',
      ['id', 'nombre', 'descripcion', 'calorias', 'imagen', 'tipo', 'createdAt', 'updatedAt'],
      seedData.foodCatalogItems
    )
    await insertRows(
      client,
      'WeeklyMenu',
      ['id', 'name', 'isActive', 'startDate', 'endDate', 'createdAt', 'updatedAt'],
      seedData.weeklyMenus
    )
    await insertRows(
      client,
      'MenuDay',
      ['id', 'weeklyMenuId', 'dayOfWeek', 'order', 'createdAt', 'updatedAt'],
      seedData.menuDays
    )
    await insertRows(
      client,
      'DaySlot',
      ['id', 'menuDayId', 'slotType', 'contenedor', 'createdAt', 'updatedAt'],
      seedData.daySlots
    )
    await insertRows(
      client,
      'FoodComponent',
      ['id', 'daySlotId', 'componentRole', 'nombre', 'descripcion', 'calorias', 'imagen', 'tipo', 'catalogItemId', 'createdAt', 'updatedAt'],
      seedData.foodComponents
    )
    await upsertAdminUser(client)
    await insertBasePlans(client)

    await client.query('COMMIT')

    console.log(
      `Seed completado: ${seedData.weeklyMenus.length} menus, ${seedData.menuDays.length} dias, ${seedData.daySlots.length} slots, ${seedData.foodCatalogItems.length} items de catalogo, ${seedData.foodComponents.length} componentes, ${seedData.basePlans.length} planes base y admin ${seedData.adminUser.email}.`
    )
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
