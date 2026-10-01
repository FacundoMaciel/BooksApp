/**
 * Importa a PostgreSQL las portadas que antes se guardaban en disco.
 *
 *   npm run db:import-uploads                     # usa data/uploads/covers
 *   npm run db:import-uploads -- otra/carpeta
 *
 * Conserva el id de cada archivo (`<uuid>.<ext>`), así las URLs ya guardadas en los
 * libros siguen funcionando. Las que ya están en la base se omiten.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getDatabaseUrl, loadEnv } from '../config';
import { createPool, migrate } from '../db/database';
import { PgCoverRepository } from '../repositories/pgCoverRepository';
import { detectFormat, MAX_COVER_BYTES } from '../services/coverStorage';

const FILENAME = /^([0-9a-f-]{36})\.(jpg|png|gif|webp)$/;

async function main() {
  loadEnv();
  const dir = resolve(process.argv[2] ?? 'data/uploads/covers');
  if (!existsSync(dir)) {
    console.log(`No existe ${dir}: no hay portadas para importar.`);
    return;
  }

  const db = createPool(getDatabaseUrl());
  const repo = new PgCoverRepository(db);
  const summary = { importadas: 0, yaExistian: 0, omitidas: [] as string[] };

  try {
    await migrate(db);
    for (const file of readdirSync(dir)) {
      const match = FILENAME.exec(file);
      const data = readFileSync(join(dir, file));
      const format = detectFormat(data);
      if (!match || !format || format.ext !== match[2] || data.length > MAX_COVER_BYTES) {
        summary.omitidas.push(file);
        continue;
      }
      if (await repo.findById(match[1]!)) {
        summary.yaExistian++;
        continue;
      }
      await repo.save({ id: match[1]!, mimeType: format.mimeType, data });
      summary.importadas++;
    }
    console.log(`Portadas en ${dir}:`, summary);
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error('✘', error instanceof Error ? error.message : error);
  process.exit(1);
});
