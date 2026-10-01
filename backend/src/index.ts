import { createApp, defaultAuthConfig } from './app';
import { getDatabaseUrl, getServerConfig, loadEnv } from './config';
import { createPool, migrate } from './db/database';
import { PgLibraryRepository } from './repositories/pgLibraryRepository';
import { seedLibrary } from './seed';

async function main() {
  loadEnv();
  const config = getServerConfig();

  if (!config.jwtSecret) {
    console.warn('JWT_SECRET no definido: se usa un secreto de desarrollo. No usar así en producción.');
  }

  const databaseUrl = getDatabaseUrl();
  const db = createPool(databaseUrl);
  const applied = await migrate(db);
  console.log(`PostgreSQL conectado (${new URL(databaseUrl).hostname})${applied ? `, ${applied} migraciones aplicadas` : ''}.`);

  if (config.seed) {
    const inserted = await seedLibrary(new PgLibraryRepository(db));
    if (inserted > 0) console.log(`Se agregaron ${inserted} libros de ejemplo.`);
  }

  const server = createApp({
    db,
    auth: {
      jwtSecret: config.jwtSecret ?? defaultAuthConfig.jwtSecret,
      tokenTtlSeconds: config.tokenTtlSeconds,
    },
    corsOrigins: config.corsOrigins,
  }).listen(config.port, () => {
    console.log(`API escuchando en http://localhost:${config.port}`);
    console.log(`CORS: ${config.corsOrigins.length ? config.corsOrigins.join(', ') : 'cualquier origen'}`);
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
