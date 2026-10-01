import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import jwt from 'jsonwebtoken';
import { createTestApp } from './helpers';

const SECRET = 'test-secret';
const credentials = { name: 'Ada Lovelace', email: 'Ada@Example.com', password: 'supersegura' };

describe('Auth', () => {
  let app: Express;

  beforeEach(async () => {
    app = await createTestApp({ auth: { jwtSecret: SECRET, tokenTtlSeconds: 60 } });
  });

  const register = (body: object = credentials) => request(app).post('/auth/register').send(body);

  describe('POST /auth/register', () => {
    it('crea la cuenta y devuelve token + usuario sin la contraseña', async () => {
      const res = await register();
      expect(res.status).toBe(201);
      expect(res.body.token).toEqual(expect.any(String));
      expect(res.body.user).toEqual({ id: 1, name: 'Ada Lovelace', email: 'ada@example.com' });
    });

    it('rechaza emails duplicados (sin distinguir mayúsculas)', async () => {
      await register();
      const res = await register({ ...credentials, email: 'ADA@example.com' });
      expect(res.status).toBe(409);
    });

    it.each([
      [{ ...credentials, email: 'no-es-email' }],
      [{ ...credentials, password: 'corta' }],
      [{ ...credentials, name: '' }],
      [{ email: credentials.email }],
    ])('valida el body %#', async (body) => {
      const res = await register(body);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('devuelve token con credenciales válidas', async () => {
      await register();
      const res = await request(app)
        .post('/auth/login')
        .send({ email: 'ada@example.com', password: credentials.password });
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('ada@example.com');
      expect(res.body.token).toEqual(expect.any(String));
    });

    it('devuelve 401 con contraseña incorrecta o email inexistente', async () => {
      await register();
      const wrongPass = await request(app)
        .post('/auth/login')
        .send({ email: credentials.email, password: 'incorrecta' });
      const unknown = await request(app)
        .post('/auth/login')
        .send({ email: 'otro@example.com', password: credentials.password });

      expect(wrongPass.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrongPass.body.error).toBe(unknown.body.error);
    });
  });

  describe('GET /auth/me', () => {
    it('devuelve el usuario autenticado', async () => {
      const { body } = await register();
      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${body.token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(body.user);
    });

    it('devuelve 401 sin token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('devuelve 401 con token firmado con otro secreto', async () => {
      await register();
      const forged = jwt.sign({}, 'otro-secreto', { subject: '1' });
      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });

    it('devuelve 401 con token expirado', async () => {
      await register();
      const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, SECRET, { subject: '1' });
      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${expired}`);
      expect(res.status).toBe(401);
    });
  });
});
