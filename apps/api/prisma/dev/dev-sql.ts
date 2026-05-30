import 'dotenv/config'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import * as pg from 'pg'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

// In ESM, __dirname is not defined by default. This recreates it:
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const connectionString = process.env.DATABASE_URL

// 1. Initialize the pg Pool
const pool = new pg.Pool({ connectionString })

// 2. Setup the Adapter
const adapter = new PrismaPg(pool)

// 3. Initialize Prisma with the adapter
const prisma = new PrismaClient({ adapter })

async function main() {
  const sqlFilePath = path.join(__dirname, 'insert.sql')

  if (!fs.existsSync(sqlFilePath)) {
    throw new Error(`SQL file not found at: ${sqlFilePath}`)
  }

  const sql = fs.readFileSync(sqlFilePath, 'utf8')

  console.log('🚀 Starting SQL execution via Adapter...')

  // Split by semicolon (be careful if your SQL has semicolons inside strings/functions)
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement)
    } catch (error) {
      console.error(
        `❌ Error executing statement starting with: "${statement.substring(0, 50)}..."`
      )
      throw error
    }
  }

  console.log('✅ SQL file executed successfully.')
}

main()
  .catch((e) => {
    console.error('🔴 Seed script failed:')
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    // Standard practice: Disconnect Prisma and close the pool
    await prisma.$disconnect()
    await pool.end()
  })
