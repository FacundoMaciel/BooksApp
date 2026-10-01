import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Express } from 'express';
import { createTestApp } from './helpers';

describe('API Libros y Autores', () => {
  let app: Express;
  let token: string;

  beforeEach(async () => {
    app = await createTestApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ name: 'Tester', email: 'tester@example.com', password: 'supersegura' });
    token = res.body.token;
  });

  /** POST autenticado: crear libros y autores requiere sesión. */
  const post = (path: string) => request(app).post(path).set('Authorization', `Bearer ${token}`);
  const createAuthor = (name: string) => post('/authors').send({ name });

  describe('Autenticación requerida para crear', () => {
    it.each(['/books', '/authors'])('POST %s devuelve 401 sin token', async (path) => {
      const res = await request(app).post(path).send({ name: 'X' });
      expect(res.status).toBe(401);
    });

    it('POST /books devuelve 401 con token inválido y no crea nada', async () => {
      await createAuthor('Autor A');
      const res = await request(app)
        .post('/books')
        .set('Authorization', 'Bearer no-es-un-jwt')
        .send({ title: 'L', chapters: 1, pages: 1, authorIds: [1] });

      expect(res.status).toBe(401);
      expect((await request(app).get('/books')).body).toEqual([]);
    });

    it('las consultas siguen siendo públicas', async () => {
      expect((await request(app).get('/books')).status).toBe(200);
      expect((await request(app).get('/authors')).status).toBe(200);
    });
  });

  describe('POST /authors', () => {
    it('crea un autor', async () => {
      const res = await createAuthor('Gabriel García Márquez');
      expect(res.status).toBe(201);
      expect(res.body).toEqual({ id: 1, name: 'Gabriel García Márquez', books: [] });
    });

    it('rechaza un nombre vacío', async () => {
      const res = await createAuthor('   ');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /books', () => {
    it('crea un libro con sus autores', async () => {
      await createAuthor('Autor A');
      await createAuthor('Autor B');

      const res = await post('/books')
        .send({ title: 'Libro', chapters: 10, pages: 250, authorIds: [1, 2, 2] });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        id: 1,
        title: 'Libro',
        chapters: 10,
        pages: 250,
        coverUrl: null,
        authors: [
          { id: 1, name: 'Autor A' },
          { id: 2, name: 'Autor B' },
        ],
      });
    });

    it('guarda la portada opcional y la devuelve en el listado', async () => {
      await createAuthor('Autor A');
      const coverUrl = 'https://covers.openlibrary.org/b/id/1-M.jpg';
      const res = await post('/books').send({ title: 'L', chapters: 1, pages: 1, authorIds: [1], coverUrl });

      expect(res.status).toBe(201);
      expect(res.body.coverUrl).toBe(coverUrl);
      expect((await request(app).get('/books')).body[0].coverUrl).toBe(coverUrl);
    });

    it.each(['no-es-url', 'ftp://example.com/x.jpg', 'javascript:alert(1)'])(
      'rechaza una portada inválida: %s',
      async (coverUrl) => {
        await createAuthor('Autor A');
        const res = await post('/books').send({ title: 'L', chapters: 1, pages: 1, authorIds: [1], coverUrl });
        expect(res.status).toBe(400);
      },
    );

    it('devuelve 404 si algún autor no existe', async () => {
      await createAuthor('Autor A');
      const res = await post('/books')
        .send({ title: 'Libro', chapters: 1, pages: 1, authorIds: [1, 99] });

      expect(res.status).toBe(404);
      expect(res.body.details).toEqual({ missingAuthorIds: [99] });
    });

    it.each([
      [{ title: 'X', chapters: 0, pages: 10, authorIds: [1] }],
      [{ title: 'X', chapters: 1.5, pages: 10, authorIds: [1] }],
      [{ title: 'X', chapters: 1, pages: '10', authorIds: [1] }],
      [{ title: '', chapters: 1, pages: 10, authorIds: [1] }],
      [{ title: 'X', chapters: 1, pages: 10, authorIds: [] }],
      [{ title: 'X', chapters: 1, pages: 10 }],
    ])('valida el body %#', async (body) => {
      await createAuthor('Autor A');
      const res = await post('/books').send(body);
      expect(res.status).toBe(400);
    });

    it('devuelve 400 ante JSON mal formado', async () => {
      const res = await post('/books')
        .set('Content-Type', 'application/json')
        .send('{"title":');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /books y GET /authors (relación Many-to-Many)', () => {
    it('lista libros con autores y autores con libros', async () => {
      await createAuthor('Autor A');
      await createAuthor('Autor B');
      await createAuthor('Autor C');
      await post('/books').send({ title: 'L1', chapters: 2, pages: 20, authorIds: [1, 2] });
      await post('/books').send({ title: 'L2', chapters: 3, pages: 30, authorIds: [2] });

      const books = await request(app).get('/books');
      expect(books.status).toBe(200);
      expect(books.body.map((b: { authors: { id: number }[] }) => b.authors.map((a) => a.id))).toEqual([
        [1, 2],
        [2],
      ]);

      const authors = await request(app).get('/authors');
      expect(authors.status).toBe(200);
      expect(authors.body.map((a: { books: { title: string }[] }) => a.books.map((b) => b.title))).toEqual([
        ['L1'],
        ['L1', 'L2'],
        [],
      ]);
    });
  });

  describe('GET /books/:id/average-pages-per-chapter', () => {
    it('devuelve id y promedio como cadena con 2 decimales', async () => {
      await createAuthor('Autor A');
      await post('/books').send({ title: 'L1', chapters: 3, pages: 100, authorIds: [1] });

      const res = await request(app).get('/books/1/average-pages-per-chapter');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ id: '1', averagePagesPerChapter: '33.33' });
    });

    it('rellena con ceros cuando el promedio es exacto', async () => {
      await createAuthor('Autor A');
      await post('/books').send({ title: 'L1', chapters: 4, pages: 100, authorIds: [1] });

      const res = await request(app).get('/books/1/average-pages-per-chapter');
      expect(res.body.averagePagesPerChapter).toBe('25.00');
    });

    it('devuelve 404 si el libro no existe', async () => {
      const res = await request(app).get('/books/42/average-pages-per-chapter');
      expect(res.status).toBe(404);
    });

    it('devuelve 400 si el id no es válido', async () => {
      const res = await request(app).get('/books/abc/average-pages-per-chapter');
      expect(res.status).toBe(400);
    });
  });
});
