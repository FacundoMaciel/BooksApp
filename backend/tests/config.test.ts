import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getDatabaseUrl, getServerConfig } from '../src/config';
import { createTestApp } from './helpers';

describe('Configuración del servidor', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const stubEnv = (vars: Record<string, string | undefined>) => {
    for (const [key, value] of Object.entries(vars)) vi.stubEnv(key, value as string);
  };

  it('lee los valores del entorno', () => {
    stubEnv({
      PORT: '4000',
      JWT_SECRET: 'x'.repeat(64),
      JWT_TTL_SECONDS: '3600',
      CORS_ORIGIN: 'http://localhost:5173, https://mi-app.onrender.com',
      SEED: 'false',
    });
    expect(getServerConfig()).toEqual({
      port: 4000,
      jwtSecret: 'x'.repeat(64),
      tokenTtlSeconds: 3600,
      corsOrigins: ['http://localhost:5173', 'https://mi-app.onrender.com'],
      seed: false,
    });
  });

  it('usa valores por defecto si faltan', () => {
    stubEnv({ PORT: '', JWT_SECRET: '', JWT_TTL_SECONDS: '', CORS_ORIGIN: '', SEED: '', NODE_ENV: 'test' });
    expect(getServerConfig()).toEqual({
      port: 3000,
      jwtSecret: null,
      tokenTtlSeconds: 604800,
      corsOrigins: [],
      seed: true,
    });
  });

  it('rechaza un JWT_SECRET demasiado corto', () => {
    stubEnv({ JWT_SECRET: 'corto' });
    expect(() => getServerConfig()).toThrow(/al menos 32/);
  });

  it('exige JWT_SECRET en producción', () => {
    stubEnv({ JWT_SECRET: '', NODE_ENV: 'production' });
    expect(() => getServerConfig()).toThrow(/obligatorio en producción/);
  });

  it('rechaza números inválidos', () => {
    stubEnv({ JWT_TTL_SECONDS: 'una semana' });
    expect(() => getServerConfig()).toThrow(/JWT_TTL_SECONDS/);
  });
});

describe('CORS', () => {
  it('solo permite los orígenes configurados', async () => {
    const app = await createTestApp({ corsOrigins: ['http://localhost:5173'] });

    const allowed = await request(app).get('/health').set('Origin', 'http://localhost:5173');
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:5173');

    const blocked = await request(app).get('/health').set('Origin', 'https://sitio-malicioso.com');
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sin configuración permite cualquier origen', async () => {
    const app = await createTestApp();
    const res = await request(app).get('/health').set('Origin', 'https://otro.com');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});

describe('URL de la base de datos', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  const urls = { DATABASE_URL: '', DATABASE_URL_INTERNAL: 'postgresql://interna', DATABASE_URL_EXTERNAL: 'postgresql://externa.render.com' };

  it('DATABASE_URL tiene prioridad', () => {
    for (const [k, v] of Object.entries({ ...urls, DATABASE_URL: 'postgresql://principal', RENDER: 'true' })) vi.stubEnv(k, v);
    expect(getDatabaseUrl()).toBe('postgresql://principal');
  });

  it('en Render usa la Internal URL si falta DATABASE_URL', () => {
    for (const [k, v] of Object.entries({ ...urls, RENDER: 'true' })) vi.stubEnv(k, v);
    expect(getDatabaseUrl()).toBe('postgresql://interna');
  });

  it('en local usa la External URL', () => {
    for (const [k, v] of Object.entries({ ...urls, RENDER: '' })) vi.stubEnv(k, v);
    expect(getDatabaseUrl()).toBe('postgresql://externa.render.com');
  });

  it('si falta, el error indica qué variables parecidas hay (sin valores)', () => {
    for (const [k, v] of Object.entries({ DATABASE_URL: '', DATABASE_URL_INTERNAL: '', DATABASE_URL_EXTERNAL: '', RENDER: 'true', DATABSE_URL: 'postgresql://secreto' })) vi.stubEnv(k, v);
    expect(() => getDatabaseUrl()).toThrow(/Render → Environment.*DATABSE_URL/);
    expect(() => getDatabaseUrl()).not.toThrow(/secreto/);
  });
});
