import { DataType, newDb, type IMemoryDb } from 'pg-mem';
import type { Express } from 'express';
import { createApp, type AppDeps } from '../src/app';
import { migrate, type Db } from '../src/db/database';

/**
 * pg-mem implementa pocas funciones nativas: se registran las que usa la app con el
 * mismo comportamiento que en PostgreSQL.
 */
function registerPgFunctions(mem: IMemoryDb) {
  mem.public.registerFunction({
    name: 'decode',
    args: [DataType.text, DataType.text],
    returns: DataType.bytea,
    implementation: (value: string, format: string) => Buffer.from(value, format as BufferEncoding),
  });
  mem.public.registerFunction({
    name: 'encode',
    args: [DataType.bytea, DataType.text],
    returns: DataType.text,
    implementation: (value: Buffer, format: string) => Buffer.from(value).toString(format as BufferEncoding),
  });
}

/** Una base pg-mem nueva; cada llamada a `connect` abre un pool sobre los mismos datos. */
export function createMemoryServer() {
  const mem = newDb();
  registerPgFunctions(mem);
  return {
    connect: () => {
      const { Pool } = mem.adapters.createPg();
      return new Pool() as Db;
    },
  };
}

/**
 * Base PostgreSQL en memoria (pg-mem) con las migraciones aplicadas.
 * Ejecuta el mismo SQL que producción sin necesitar un servidor.
 */
export async function createTestDb(): Promise<Db> {
  const db = createMemoryServer().connect();
  await migrate(db);
  return db;
}

export async function createTestApp(deps: Partial<AppDeps> = {}): Promise<Express> {
  return createApp({ db: deps.db ?? (await createTestDb()), ...deps });
}
