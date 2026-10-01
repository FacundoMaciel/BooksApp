import { createApp, defaultAuthConfig } from './app';
import { getDatabaseUrl, loadEnv, uploadsDir } from './config';
import { createPool, migrate } from './db/database';
import { PgLibraryRepository } from './repositories/pgLibraryRepository';
import { seedLibrary } from './seed';

async function main() {
  loadEnv();
  const PORT = Number(process.env.PORT) || 3000;
  const JWT_SECRET = process.env.JWT_SECRET;

  if (!JWT_SECRET) {
    console.warn('JWT_SECRET no definido: se usa un secreto de desarrollo. No usar así en producción.');
  }

  const databaseUrl = getDatabaseUrl();
  const db = createPool(databaseUrl);
  const applied = await migrate(db);
  console.log(`PostgreSQL conectado (${new URL(databaseUrl).hostname})${applied ? `, ${applied} migraciones aplicadas` : ''}.`);

  if (process.env.SEED !== 'false') {
    const inserted = await seedLibrary(new PgLibraryRepository(db));
    if (inserted > 0) console.log(`Se agregaron ${inserted} libros de ejemplo.`);
  }

  const server = createApp({
    db,
    uploadsDir: uploadsDir(),
    auth: { ...defaultAuthConfig, ...(JWT_SECRET && { jwtSecret: JWT_SECRET }) },
  }).listen(PORT, () => {
    console.log(`API escuchando en http://localhost:${PORT}`);
  });

  // Cierre ordenado: termina las peticiones en curso y cierra las conexiones a la base.
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      server.close(() => {
        void db.end().then(() => process.exit(0));
      });
    });
  }
}

main().catch((error) => {
  console.error('No se pudo iniciar la API:', error instanceof Error ? error.message : error);
  process.exit(1);
});
