import { newDb } from 'pg-mem';
import type { Express } from 'express';
import { createApp, type AppDeps } from '../src/app';
import { migrate, type Db } from '../src/db/database';

/**
 * Base PostgreSQL en memoria (pg-mem) con las migraciones aplicadas.
 * Ejecuta el mismo SQL que producción sin necesitar un servidor.
 */
export async function createTestDb(): Promise<Db> {
  const mem = newDb();
  const { Pool } = mem.adapters.createPg();
  const db = new Pool() as Db;
  await migrate(db);
  return db;
}

export async function createTestApp(deps: Partial<AppDeps> = {}): Promise<Express> {
  return createApp({ db: deps.db ?? (await createTestDb()), ...deps });
}
