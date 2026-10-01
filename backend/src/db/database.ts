import { Pool, type PoolClient } from 'pg';
import { migrations } from './migrations';

export type Db = Pool;

/**
 * SSL salvo en hosts locales o internos (sin dominio, p. ej. la Internal URL de Render).
 * Render exige SSL desde afuera y su certificado es público, así que se verifica.
 */
function needsSsl(connectionString: string): boolean {
  if (process.env.PGSSLMODE === 'disable') return false;
  const host = new URL(connectionString).hostname;
  return host.includes('.') && host !== '127.0.0.1' && host !== 'localhost';
}

export function createPool(connectionString: string): Db {
  return new Pool({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: true } : undefined,
    max: 10,
    connectionTimeoutMillis: 15_000,
  });
}

/** Aplica las migraciones pendientes. Devuelve cuántas aplicó. */
export async function migrate(db: Db): Promise<number> {
  const applied = new Set(await appliedVersions(db));

  let count = 0;
  for (const [index, sql] of migrations.entries()) {
    const version = index + 1;
    if (applied.has(version)) continue;
    await withTransaction(db, async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
    });
    count++;
  }
  return count;
}

/** Versiones ya aplicadas; crea la tabla de control la primera vez. */
async function appliedVersions(db: Db): Promise<number[]> {
  try {
    const { rows } = await db.query<{ version: number }>('SELECT version FROM schema_migrations');
    return rows.map((r) => r.version);
  } catch (error) {
    // 42P01 = la tabla no existe todavía (pg-mem, usado en tests, no informa el código).
    const { code, message } = error as { code?: string; message?: string };
    if (code !== '42P01' && !/does not exist/.test(message ?? '')) throw error;
    await db.query(`
      CREATE TABLE schema_migrations (
        version    INTEGER     PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    return [];
  }
}

/** Ejecuta `fn` en una transacción: COMMIT si termina bien, ROLLBACK si lanza. */
export async function withTransaction<T>(db: Db, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
