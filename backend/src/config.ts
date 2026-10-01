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

export interface ServerConfig {
  port: number;
  /** null = sin secreto definido (se usa el de desarrollo). */
  jwtSecret: string | null;
  tokenTtlSeconds: number;
  /** Orígenes permitidos por CORS; vacío = cualquiera. */
  corsOrigins: string[];
  seed: boolean;
}

function positiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} debe ser un entero positivo (valor: "${raw}").`);
  return value;
}

/** Lee y valida la configuración del servidor desde el entorno. */
export function getServerConfig(): ServerConfig {
  const jwtSecret = process.env.JWT_SECRET || null;
  if (jwtSecret && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET debe tener al menos 32 caracteres.');
  }
  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción.');
  }
  return {
    port: positiveInt('PORT', 3000),
    jwtSecret,
    tokenTtlSeconds: positiveInt('JWT_TTL_SECONDS', 60 * 60 * 24 * 7),
    corsOrigins: (process.env.CORS_ORIGIN ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    seed: process.env.SEED !== 'false',
  };
}
