#!/usr/bin/env node
/**
 * LedgerGuard Dynamic Prisma Database Provider Configuration
 * Seamlessly configures PostgreSQL for Vercel Serverless (Postgres/Neon/Supabase)
 * while preserving local zero-config SQLite development.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const schemaTarget = path.join(root, 'prisma', 'schema.prisma');
const schemaPg = path.join(root, 'prisma', 'schema.postgresql.prisma');
const schemaSqlite = path.join(root, 'prisma', 'schema.sqlite.prisma');

const isPostgres = Boolean(
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'))
);

if (isPostgres) {
  console.log('⚡ [LedgerGuard Deploy] Detected PostgreSQL environment.');
  console.log('⚡ [LedgerGuard Deploy] Activating Vercel Serverless PostgreSQL / Neon schema.');
  if (fs.existsSync(schemaPg)) {
    fs.copyFileSync(schemaPg, schemaTarget);
  }
} else {
  console.log('📦 [LedgerGuard Local] Retaining SQLite dev.db schema for local sandbox development.');
  if (fs.existsSync(schemaSqlite)) {
    fs.copyFileSync(schemaSqlite, schemaTarget);
  }
}
