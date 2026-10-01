import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { migrate, type Db } from '../src/db/database';
import { migrations } from '../src/db/migrations';
import { PgLibraryRepository } from '../src/repositories/pgLibraryRepository';
import { SEED_BOOKS, openLibraryCover, seedLibrary } from '../src/seed';
import { createMemoryServer } from './helpers';

const auth = { jwtSecret: 'test-secret', tokenTtlSeconds: 60 };
const account = { name: 'Ada', email: 'ada@example.com', password: 'supersegura' };

/** Una base pg-mem; cada llamada abre una conexión nueva (como un reinicio del servidor). */
const memoryServer = () => createMemoryServer().connect;

describe('PostgreSQL', () => {
  it('cuentas, sesión y datos sobreviven a un reinicio del servidor', async () => {
    const connect = memoryServer();

    // Primer arranque: registro y carga de datos.
    const firstDb = connect();
    await migrate(firstDb);
    const first = createApp({ db: firstDb, auth });
    const { body } = await request(first).post('/auth/register').send(account);
    const bearer = `Bearer ${body.token}`;
    await request(first).post('/authors').set('Authorization', bearer).send({ name: 'Borges' });
    await request(first).post('/authors').set('Authorization', bearer).send({ name: 'Bioy Casares' });
    await request(first)
      .post('/books')
      .set('Authorization', bearer)
      .send({ title: 'Seis problemas', chapters: 6, pages: 157, authorIds: [2, 1] });
    await firstDb.end();

    // Segundo arranque, con una conexión nueva.
    const secondDb = connect();
    expect(await migrate(secondDb)).toBe(0);
    const second = createApp({ db: secondDb, auth });

    const me = await request(second).get('/auth/me').set('Authorization', bearer);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(account.email);

    const login = await request(second).post('/auth/login').send({ email: 'ADA@example.com', password: account.password });
    expect(login.status).toBe(200);

    const duplicate = await request(second).post('/auth/register').send({ ...account, email: 'Ada@Example.com' });
    expect(duplicate.status).toBe(409);

    // Se conserva el orden de los autores.
    expect((await request(second).get('/books')).body).toEqual([
      {
        id: 1,
        title: 'Seis problemas',
        chapters: 6,
        pages: 157,
        coverUrl: null,
        authors: [
          { id: 2, name: 'Bioy Casares' },
          { id: 1, name: 'Borges' },
        ],
      },
    ]);
  });

  it('las migraciones se aplican una sola vez', async () => {
    const db = memoryServer()();
    expect(await migrate(db)).toBe(migrations.length);
    expect(await migrate(db)).toBe(0);
    const { rows } = await db.query('SELECT version FROM schema_migrations ORDER BY version');
    expect(rows.map((r) => r.version)).toEqual(migrations.map((_, i) => i + 1));
  });

  it('el seed es idempotente', async () => {
    const db = memoryServer()();
    await migrate(db);
    const repo = new PgLibraryRepository(db);

    expect(await seedLibrary(repo)).toBe(SEED_BOOKS.length);
    expect(await seedLibrary(repo)).toBe(0);
    expect(await repo.findAllBooks()).toHaveLength(SEED_BOOKS.length);
  });

  it('el seed completa una base existente sin duplicar ni pisar portadas', async () => {
    const db = memoryServer()();
    await migrate(db);
    const repo = new PgLibraryRepository(db);
    const borges = await repo.createAuthor({ name: 'Jorge Luis Borges' });
    await repo.createBook({ title: 'Ficciones', chapters: 17, pages: 224, coverUrl: null }, [borges.id]);
    await repo.createBook({ title: 'Mi libro', chapters: 1, pages: 10, coverUrl: 'https://example.com/mia.jpg' }, [borges.id]);

    expect(await seedLibrary(repo)).toBe(SEED_BOOKS.length - 1);

    const books = await repo.findAllBooks();
    expect(books).toHaveLength(SEED_BOOKS.length + 1);
    expect((await repo.findAllAuthors()).filter((a) => a.name === 'Jorge Luis Borges')).toHaveLength(1);
    expect(books.find((b) => b.title === 'Ficciones')?.coverUrl).toBe(openLibraryCover(SEED_BOOKS[0]!.coverId));
    expect(books.find((b) => b.title === 'Mi libro')?.coverUrl).toBe('https://example.com/mia.jpg');
  });

  it('la base aplica integridad referencial y las restricciones CHECK', async () => {
    const db = memoryServer()();
    await migrate(db);
    await expect(db.query('INSERT INTO book_authors (book_id, author_id, position) VALUES (99, 99, 0)')).rejects.toThrow();
    await expect(db.query("INSERT INTO books (title, chapters, pages) VALUES ('X', 0, 10)")).rejects.toThrow();
    await expect(db.query("INSERT INTO users (name, email, password_hash) VALUES ('a', 'A@x.com', 'h')")).rejects.toThrow();
  });
});
