import { withTransaction, type Db } from '../db/database';
import type { Author, AuthorInfo, Book, BookAuthor, NewAuthor } from '../domain/entities';
import type { LibraryRepository } from './libraryRepository';

const BOOK_COLUMNS = 'id, title, chapters, pages, cover_url AS "coverUrl"';
const AUTHOR_COLUMNS =
  'id, name, nationality, birth_year AS "birthYear", death_year AS "deathYear", biography, photo_url AS "photoUrl"';

/** `$1, $2, …` para una lista de parámetros. */
const placeholders = (count: number) => Array.from({ length: count }, (_, i) => `$${i + 1}`).join(', ');

export class PgLibraryRepository implements LibraryRepository {
  constructor(private readonly db: Db) {}

  async createAuthor(data: NewAuthor): Promise<Author> {
    const { rows } = await this.db.query<Author>(
      `INSERT INTO authors (name, nationality, birth_year, death_year, biography, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${AUTHOR_COLUMNS}`,
      [
        data.name,
        data.nationality ?? null,
        data.birthYear ?? null,
        data.deathYear ?? null,
        data.biography ?? null,
        data.photoUrl ?? null,
      ],
    );
    return rows[0]!;
  }

  async fillAuthorInfo(id: number, info: Partial<AuthorInfo>): Promise<void> {
    await this.db.query(
      `UPDATE authors SET
         nationality = COALESCE(nationality, $2),
         birth_year  = COALESCE(birth_year, $3),
         death_year  = COALESCE(death_year, $4),
         biography   = COALESCE(biography, $5),
         photo_url   = COALESCE(photo_url, $6)
       WHERE id = $1`,
      [
        id,
        info.nationality ?? null,
        info.birthYear ?? null,
        info.deathYear ?? null,
        info.biography ?? null,
        info.photoUrl ?? null,
      ],
    );
  }

  async findAllAuthors(): Promise<Author[]> {
    const { rows } = await this.db.query<Author>(`SELECT ${AUTHOR_COLUMNS} FROM authors ORDER BY id`);
    return rows;
  }

  async findAuthorsByIds(ids: number[]): Promise<Author[]> {
    if (ids.length === 0) return [];
    const { rows } = await this.db.query<Author>(
      `SELECT ${AUTHOR_COLUMNS} FROM authors WHERE id IN (${placeholders(ids.length)})`,
      ids,
    );
    const byId = new Map(rows.map((a) => [a.id, a]));
    // Se respeta el orden en que se pidieron.
    return ids.map((id) => byId.get(id)).filter((a): a is Author => a !== undefined);
  }

  async createBook(data: Omit<Book, 'id'>, authorIds: number[]): Promise<Book> {
    // Libro y relaciones en una transacción: o se guarda todo o nada.
    return withTransaction(this.db, async (client) => {
      const { rows } = await client.query<Book>(
        `INSERT INTO books (title, chapters, pages, cover_url) VALUES ($1, $2, $3, $4) RETURNING ${BOOK_COLUMNS}`,
        [data.title, data.chapters, data.pages, data.coverUrl],
      );
      const book = rows[0]!;
      for (const [position, authorId] of authorIds.entries()) {
        await client.query('INSERT INTO book_authors (book_id, author_id, position) VALUES ($1, $2, $3)', [
          book.id,
          authorId,
          position,
        ]);
      }
      return book;
    });
  }

  async findAllBooks(): Promise<Book[]> {
    const { rows } = await this.db.query<Book>(`SELECT ${BOOK_COLUMNS} FROM books ORDER BY id`);
    return rows;
  }

  async findBookById(id: number): Promise<Book | undefined> {
    const { rows } = await this.db.query<Book>(`SELECT ${BOOK_COLUMNS} FROM books WHERE id = $1`, [id]);
    return rows[0];
  }

  async updateBookCover(id: number, coverUrl: string | null): Promise<void> {
    await this.db.query('UPDATE books SET cover_url = $1 WHERE id = $2', [coverUrl, id]);
  }

  async findAllRelations(): Promise<BookAuthor[]> {
    const { rows } = await this.db.query<BookAuthor>(
      'SELECT book_id AS "bookId", author_id AS "authorId" FROM book_authors ORDER BY book_id, position',
    );
    return rows;
  }
}
