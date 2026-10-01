import type { AuthorWithBooks, BookWithAuthors, PagesPerChapter } from '../domain/entities';
import { NotFoundError } from '../domain/errors';
import type { CreateAuthorInput, CreateBookInput } from '../domain/schemas';
import type { LibraryRepository } from '../repositories/libraryRepository';

const isDefined = <T>(value: T | undefined): value is T => value !== undefined;

export class LibraryService {
  constructor(private readonly repo: LibraryRepository) {}

  async createAuthor(input: CreateAuthorInput): Promise<AuthorWithBooks> {
    const author = await this.repo.createAuthor({ name: input.name });
    return { ...author, books: [] };
  }

  async listAuthors(): Promise<AuthorWithBooks[]> {
    const [authors, books, relations] = await Promise.all([
      this.repo.findAllAuthors(),
      this.repo.findAllBooks(),
      this.repo.findAllRelations(),
    ]);
    const booksById = new Map(books.map((b) => [b.id, b]));

    return authors.map((author) => ({
      ...author,
      books: relations
        .filter((r) => r.authorId === author.id)
        .map((r) => booksById.get(r.bookId))
        .filter(isDefined),
    }));
  }

  async createBook(input: CreateBookInput): Promise<BookWithAuthors> {
    const { authorIds, ...data } = input;

    const authors = await this.repo.findAuthorsByIds(authorIds);
    if (authors.length !== authorIds.length) {
      const found = new Set(authors.map((a) => a.id));
      const missingAuthorIds = authorIds.filter((id) => !found.has(id));
      throw new NotFoundError('Uno o más autores no existen', { missingAuthorIds });
    }

    const book = await this.repo.createBook(data, authorIds);
    return { ...book, authors };
  }

  async listBooks(): Promise<BookWithAuthors[]> {
    const [authors, books, relations] = await Promise.all([
      this.repo.findAllAuthors(),
      this.repo.findAllBooks(),
      this.repo.findAllRelations(),
    ]);
    const authorsById = new Map(authors.map((a) => [a.id, a]));

    return books.map((book) => ({
      ...book,
      authors: relations
        .filter((r) => r.bookId === book.id)
        .map((r) => authorsById.get(r.authorId))
        .filter(isDefined),
    }));
  }

  async getPagesPerChapter(bookId: number): Promise<PagesPerChapter> {
    const book = await this.repo.findBookById(bookId);
    if (!book) {
      throw new NotFoundError(`No existe el libro con id ${bookId}`);
    }
    // chapters se valida > 0 al crear el libro, por lo que no hay división por cero.
    return {
      id: String(book.id),
      averagePagesPerChapter: (book.pages / book.chapters).toFixed(2),
    };
  }
}
