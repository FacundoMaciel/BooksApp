import type { Author, AuthorInfo, Book, BookAuthor, NewAuthor } from '../domain/entities';

/**
 * Contrato del repositorio. Los servicios dependen de esta interfaz y no del
 * motor de base de datos concreto.
 */
export interface LibraryRepository {
  createAuthor(data: NewAuthor): Promise<Author>;
  /** Completa solo los campos de información que el autor todavía no tiene. */
  fillAuthorInfo(id: number, info: Partial<AuthorInfo>): Promise<void>;
  findAllAuthors(): Promise<Author[]>;
  findAuthorsByIds(ids: number[]): Promise<Author[]>;

  /** Crea el libro junto con sus relaciones con autores, en una transacción. */
  createBook(data: Omit<Book, 'id'>, authorIds: number[]): Promise<Book>;
  findAllBooks(): Promise<Book[]>;
  findBookById(id: number): Promise<Book | undefined>;
  updateBookCover(id: number, coverUrl: string | null): Promise<void>;

  findAllRelations(): Promise<BookAuthor[]>;
}
