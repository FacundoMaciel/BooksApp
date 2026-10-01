/**
 * Copia todos los datos de la base SQLite anterior a PostgreSQL.
 *
 *   npm run db:migrate-sqlite                 # usa data/library.db
 *   npm run db:migrate-sqlite -- otra.db      # otra ruta
 *   npm run db:migrate-sqlite -- --replace    # vacía antes las tablas de Postgres
 *
 * Conserva ids, fechas y hashes de contraseña (los usuarios siguen pudiendo iniciar sesión).
 * Todo ocurre en una transacción: si algo falla, Postgres queda como estaba.
 */
import Database from 'better-sqlite3';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { PoolClient } from 'pg';
import { getDatabaseUrl, loadEnv } from '../config';
import { createPool, migrate, withTransaction } from '../db/database';

type Row = Record<string, unknown>;
const TABLES = ['users', 'authors', 'books', 'book_authors'] as const;

/** SQLite guarda `YYYY-MM-DD HH:MM:SS` en UTC. */
const toTimestamp = (value: unknown) => (typeof value === 'string' ? `${value.replace(' ', 'T')}Z` : new Date());

/** INSERT de varias filas en una sola consulta. */
async function insertMany(client: PoolClient, table: string, columns: string[], rows: unknown[][]) {
  if (rows.length === 0) return;
  const values = rows
    .map((_, r) => `(${columns.map((__, c) => `$${r * columns.length + c + 1}`).join(', ')})`)
    .join(', ');
  await client.query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values}`, rows.flat());
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const replace = args.includes('--replace');
  const sqlitePath = resolve(args.find((a) => !a.startsWith('--')) ?? 'data/library.db');

  if (!existsSync(sqlitePath)) throw new Error(`No existe la base SQLite: ${sqlitePath}`);
  const sqlite = new Database(sqlitePath, { readonly: true, fileMustExist: true });
  const all = (sql: string) => sqlite.prepare(sql).all() as Row[];
  const hasCover = all('PRAGMA table_info(books)').some((c) => c.name === 'cover_url');

  const users = all('SELECT id, name, email, password_hash, created_at FROM users ORDER BY id');
  const authors = all('SELECT id, name, created_at FROM authors ORDER BY id');
  const books = all(
    `SELECT id, title, chapters, pages, ${hasCover ? 'cover_url' : 'NULL AS cover_url'}, created_at FROM books ORDER BY id`,
  );
  // El orden de inserción (rowid) era el orden de los autores de cada libro.
  const relations = all('SELECT book_id, author_id FROM book_authors ORDER BY book_id, rowid');
  sqlite.close();

  console.log(`SQLite (${sqlitePath}):`);
  console.log(`  ${users.length} usuarios, ${authors.length} autores, ${books.length} libros, ${relations.length} relaciones`);

  const db = createPool(getDatabaseUrl());
  try {
    await migrate(db);

    const counts = async () =>
      Object.fromEntries(
        await Promise.all(
          TABLES.map(async (t) => [t, (await db.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n as number]),
        ),
      ) as Record<(typeof TABLES)[number], number>;

    const before = await counts();
    if (Object.values(before).some((n) => n > 0) && !replace) {
      throw new Error(
        `PostgreSQL ya tiene datos (${JSON.stringify(before)}). ` +
          'Usa --replace para vaciar las tablas y copiar todo desde SQLite.',
      );
    }

    await withTransaction(db, async (client) => {
      if (replace) {
        await client.query('TRUNCATE book_authors, books, authors, users RESTART IDENTITY CASCADE');
      }

      await insertMany(
        client,
        'users',
        ['id', 'name', 'email', 'password_hash', 'created_at'],
        users.map((u) => [u.id, u.name, String(u.email).toLowerCase(), u.password_hash, toTimestamp(u.created_at)]),
      );
      await insertMany(
        client,
        'authors',
        ['id', 'name', 'created_at'],
        authors.map((a) => [a.id, a.name, toTimestamp(a.created_at)]),
      );
      await insertMany(
        client,
        'books',
        ['id', 'title', 'chapters', 'pages', 'cover_url', 'created_at'],
        books.map((b) => [b.id, b.title, b.chapters, b.pages, b.cover_url, toTimestamp(b.created_at)]),
      );

      const positions = new Map<unknown, number>();
      await insertMany(
        client,
        'book_authors',
        ['book_id', 'author_id', 'position'],
        relations.map((r) => {
          const position = positions.get(r.book_id) ?? 0;
          positions.set(r.book_id, position + 1);
          return [r.book_id, r.author_id, position];
        }),
      );

      // Los ids se insertaron a mano: se ajustan las secuencias para que los próximos no choquen.
      for (const table of ['users', 'authors', 'books']) {
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM ${table}`,
        );
      }
    });

    const after = await counts();
    const expected = { users: users.length, authors: authors.length, books: books.length, book_authors: relations.length };
    const ok = TABLES.every((t) => after[t] === expected[t]);
    console.log(`PostgreSQL: ${JSON.stringify(after)}`);
    if (!ok) throw new Error(`Las cantidades no coinciden con SQLite: ${JSON.stringify(expected)}`);
    console.log('✔ Migración completada.');
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error('✘', error instanceof Error ? error.message : error);
  process.exit(1);
});
