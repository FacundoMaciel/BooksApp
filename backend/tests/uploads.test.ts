import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createTestApp } from './helpers';
import { MAX_COVER_BYTES } from '../src/services/coverStorage';

// PNG mínimo válido (1x1).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Subida de portadas', () => {
  let app: Express;
  let token: string;
  let uploadsDir: string;

  beforeEach(async () => {
    uploadsDir = mkdtempSync(join(tmpdir(), 'libros-uploads-test-'));
    app = await createTestApp({ uploadsDir });
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Tester', email: 'tester@example.com', password: 'supersegura' });
    token = res.body.token;
  });

  afterEach(() => {
    rmSync(uploadsDir, { recursive: true, force: true });
  });

  const upload = (data: Buffer, filename = 'portada.png') =>
    request(app).post('/uploads/covers').set('Authorization', `Bearer ${token}`).attach('cover', data, filename);

  it('guarda la imagen, la sirve y se puede usar como portada de un libro', async () => {
    const res = await upload(PNG);
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/covers\/[0-9a-f-]{36}\.png$/);
    expect(readdirSync(join(uploadsDir, 'covers'))).toHaveLength(1);

    const file = await request(app).get(res.body.url);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(file.headers['x-content-type-options']).toBe('nosniff');

    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/authors').set(auth).send({ name: 'Autor' });
    const book = await request(app)
      .post('/books')
      .set(auth)
      .send({ title: 'Con portada', chapters: 1, pages: 10, authorIds: [1], coverUrl: res.body.url });
    expect(book.status).toBe(201);
    expect(book.body.coverUrl).toBe(res.body.url);
  });

  it('detecta el formato por el contenido, no por el nombre del archivo', async () => {
    const res = await upload(PNG, 'engañoso.gif');
    expect(res.body.url).toMatch(/\.png$/);
  });

  it('rechaza archivos que no son imágenes aunque tengan extensión de imagen', async () => {
    const res = await upload(Buffer.from('<script>alert(1)</script>'), 'falsa.png');
    expect(res.status).toBe(400);
    expect(readdirSync(join(uploadsDir, 'covers'))).toHaveLength(0);
  });

  it('rechaza imágenes demasiado grandes', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_COVER_BYTES)]);
    const res = await upload(big);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no puede superar/);
  });

  it('devuelve 400 si falta el archivo', async () => {
    const res = await request(app).post('/uploads/covers').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('requiere sesión', async () => {
    const res = await request(app).post('/uploads/covers').attach('cover', PNG, 'portada.png');
    expect(res.status).toBe(401);
  });

  it('no acepta como portada rutas arbitrarias del servidor', async () => {
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/authors').set(auth).send({ name: 'Autor' });
    const res = await request(app)
      .post('/books')
      .set(auth)
      .send({ title: 'X', chapters: 1, pages: 1, authorIds: [1], coverUrl: '/uploads/../data/library.db' });
    expect(res.status).toBe(400);
  });
});
