import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import type { Db } from '../src/db/database';
import { MAX_COVER_BYTES } from '../src/services/coverStorage';
import { createTestApp, createTestDb } from './helpers';

// PNG mínimo válido (1x1).
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

describe('Subida de portadas', () => {
  let app: Express;
  let db: Db;
  let token: string;

  beforeEach(async () => {
    db = await createTestDb();
    app = await createTestApp({ db });
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Tester', email: 'tester@example.com', password: 'supersegura' });
    token = res.body.token;
  });

  const storedCovers = async () =>
    (await db.query<{ n: number }>('SELECT count(*)::int AS n FROM cover_images')).rows[0]!.n;

  const upload = (data: Buffer, filename = 'portada.png') =>
    request(app).post('/uploads/covers').set('Authorization', `Bearer ${token}`).attach('cover', data, filename);

  it('guarda la imagen en la base, la sirve intacta y se puede usar como portada', async () => {
    const res = await upload(PNG);
    expect(res.status).toBe(201);
    expect(res.body.url).toMatch(/^\/uploads\/covers\/[0-9a-f-]{36}\.png$/);
    expect(await storedCovers()).toBe(1);

    const file = await request(app).get(res.body.url);
    expect(file.status).toBe(200);
    expect(file.headers['content-type']).toBe('image/png');
    expect(file.headers['x-content-type-options']).toBe('nosniff');
    expect(file.headers['cache-control']).toContain('immutable');
    expect(Buffer.compare(file.body as Buffer, PNG)).toBe(0);

    const auth = { Authorization: `Bearer ${token}` };
    await request(app).post('/authors').set(auth).send({ name: 'Autor' });
    const book = await request(app)
      .post('/books')
      .set(auth)
      .send({ title: 'Con portada', chapters: 1, pages: 10, authorIds: [1], coverUrl: res.body.url });
    expect(book.status).toBe(201);
    expect(book.body.coverUrl).toBe(res.body.url);
  });

  it('las portadas sobreviven a un reinicio del servidor (no dependen del disco)', async () => {
    const { body } = await upload(PNG);
    const restarted = await createTestApp({ db });
    const file = await request(restarted).get(body.url);
    expect(file.status).toBe(200);
    expect(Buffer.compare(file.body as Buffer, PNG)).toBe(0);
  });

  it('detecta el formato por el contenido, no por el nombre del archivo', async () => {
    const res = await upload(PNG, 'engañoso.gif');
    expect(res.body.url).toMatch(/\.png$/);
  });

  it('devuelve 404 para portadas inexistentes o con otra extensión', async () => {
    const { body } = await upload(PNG);
    expect((await request(app).get(body.url.replace('.png', '.jpg'))).status).toBe(404);
    expect((await request(app).get('/uploads/covers/00000000-0000-4000-8000-000000000000.png')).status).toBe(404);
    expect((await request(app).get('/uploads/covers/..%2F..%2F.env')).status).toBe(404);
  });

  it('rechaza archivos que no son imágenes aunque tengan extensión de imagen', async () => {
    const res = await upload(Buffer.from('<script>alert(1)</script>'), 'falsa.png');
    expect(res.status).toBe(400);
    expect(await storedCovers()).toBe(0);
  });

  it('rechaza imágenes demasiado grandes', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(MAX_COVER_BYTES)]);
    const res = await upload(big);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no puede superar/);
    expect(await storedCovers()).toBe(0);
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
