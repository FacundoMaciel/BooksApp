import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getServerConfig } from '../src/config';
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
