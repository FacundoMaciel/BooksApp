import type { Author, Book, BookAuthor } from '../domain/entities';

/**
 * Contrato del repositorio. Los servicios dependen de esta interfaz y no del
 * motor de base de datos concreto.
 */
export interface LibraryRepository {
  createAuthor(data: Omit<Author, 'id'>): Promise<Author>;
  findAllAuthors(): Promise<Author[]>;
  findAuthorsByIds(ids: number[]): Promise<Author[]>;

  /** Crea el libro junto con sus relaciones con autores, en una transacción. */
  createBook(data: Omit<Book, 'id'>, authorIds: number[]): Promise<Book>;
  findAllBooks(): Promise<Book[]>;
  findBookById(id: number): Promise<Book | undefined>;
  updateBookCover(id: number, coverUrl: string | null): Promise<void>;

  findAllRelations(): Promise<BookAuthor[]>;
}
