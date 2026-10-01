export interface Book {
  id: number;
  title: string;
  chapters: number;
  pages: number;
  /** URL de la imagen de portada (opcional). */
  coverUrl: string | null;
}

export interface Author {
  id: number;
  name: string;
}

/** Tabla intermedia de la relación Many-to-Many entre libros y autores. */
export interface BookAuthor {
  bookId: number;
  authorId: number;
}

export interface BookWithAuthors extends Book {
  authors: Author[];
}

export interface AuthorWithBooks extends Author {
  books: Book[];
}

export interface PagesPerChapter {
  id: string;
  averagePagesPerChapter: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
}

/** Usuario sin datos sensibles, apto para devolver al cliente. */
export type PublicUser = Omit<User, 'passwordHash'>;

export interface AuthResult {
  token: string;
  user: PublicUser;
}
