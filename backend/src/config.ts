import { resolve } from 'node:path';

/** Carga `backend/.env` si existe (Node ≥ 20.12). Las variables ya definidas tienen prioridad. */
export function loadEnv(): void {
  try {
    process.loadEnvFile('.env');
  } catch {
    // Sin archivo .env: se usan las variables del entorno.
  }
}

/**
 * URL de PostgreSQL. `DATABASE_URL` tiene prioridad (p. ej. la Internal URL al desplegar en Render);
 * en local se usa `DATABASE_URL_EXTERNAL`.
 */
export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL ?? process.env.DATABASE_URL_EXTERNAL;
  if (!url) {
    throw new Error('Falta DATABASE_URL (o DATABASE_URL_EXTERNAL) en backend/.env o en el entorno.');
  }
  return url;
}

export const uploadsDir = () => resolve(process.env.UPLOADS_DIR ?? 'data/uploads');
