export interface Book {
  id: number;
  title: string;
  chapters: number;
  pages: number;
  /** URL de la imagen de portada (opcional). */
  coverUrl: string | null;
}

/** Información opcional de un autor. */
export interface AuthorInfo {
  nationality: string | null;
  birthYear: number | null;
  deathYear: number | null;
  biography: string | null;
  /** URL de la foto (externa o subida con POST /uploads/covers). */
  photoUrl: string | null;
}

export interface Author extends AuthorInfo {
  id: number;
  name: string;
}

/** Datos mínimos del autor que se incluyen en cada libro. */
export type AuthorSummary = Pick<Author, 'id' | 'name'>;

export type NewAuthor = Pick<Author, 'name'> & Partial<AuthorInfo>;

/** Tabla intermedia de la relación Many-to-Many entre libros y autores. */
export interface BookAuthor {
  bookId: number;
  authorId: number;
}

export interface BookWithAuthors extends Book {
  authors: AuthorSummary[];
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
