/**
 * Shared pgLite + Prisma test utility
 *
 * Provides createTestDb() for creating an in-process PostgreSQL instance
 * and cleanDb() for truncating all tables between tests.
 *
 * No Docker required — pgLite compiles PostgreSQL to WebAssembly and runs in-process.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { PrismaPGlite } from 'pglite-prisma-adapter'
import { PrismaClient } from '@prisma/client'

const MIGRATIONS_DIR = join(process.cwd(), 'prisma', 'migrations')

/**
 * Read the initial migration SQL from disk.
 * Returns all migration SQL files concatenated in directory-sorted order.
 */
function loadMigrationSql(): string {
  const { readdirSync } = require('node:fs')
  const migrationDirs = readdirSync(MIGRATIONS_DIR)
    .filter((entry: string) => !entry.includes('.toml'))
    .sort()

  const sqlParts: string[] = []
  for (const dir of migrationDirs) {
    const sqlPath = join(MIGRATIONS_DIR, dir, 'migration.sql')
    try {
      sqlParts.push(readFileSync(sqlPath, 'utf-8'))
    } catch {
      // skip missing files
    }
  }
  return sqlParts.join('\n')
}

/**
 * Creates an in-process pgLite PostgreSQL instance with the full schema applied.
 * Returns a PrismaClient connected through the pgLite adapter.
 *
 * Each call creates a fresh, isolated database — safe for parallel tests.
 */
export async function createTestDb(): Promise<PrismaClient> {
  // Create in-memory pgLite instance (memory:// = no files on disk)
  const pglite = new PGlite()

  // Apply all migrations directly to the in-process database
  const migrationSql = loadMigrationSql()
  await pglite.exec(migrationSql)

  // Connect Prisma through the pgLite adapter
  const adapter = new PrismaPGlite(pglite)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new PrismaClient({ adapter } as any)

  return prisma
}

/**
 * Truncates all tables in the test database.
 * Call in beforeEach to ensure a clean state between tests.
 */
export async function cleanDb(prisma: PrismaClient): Promise<void> {
  // Delete in dependency order (child tables first)
  await prisma.articleBezirk.deleteMany()
  await prisma.article.deleteMany()
  await prisma.bezirk.deleteMany()
}
