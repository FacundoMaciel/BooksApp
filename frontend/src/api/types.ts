export interface AuthorInfo {
  nationality: string | null;
  birthYear: number | null;
  deathYear: number | null;
  biography: string | null;
  photoUrl: string | null;
}

/** Resumen del autor (así viene dentro de cada libro). */
export interface Author {
  id: number;
  name: string;
}

export type NewAuthor = { name: string } & Partial<{ [K in keyof AuthorInfo]: Exclude<AuthorInfo[K], null> }>;

export interface Book {
  id: number;
  title: string;
  chapters: number;
  pages: number;
  coverUrl: string | null;
  authors: Author[];
}

/** Autor completo, como lo devuelve GET /authors. */
export interface AuthorWithBooks extends Author, AuthorInfo {
  books: Omit<Book, 'authors'>[];
}

export interface NewBook {
  title: string;
  chapters: number;
  pages: number;
  coverUrl?: string;
  authorIds: number[];
}

export interface User {
  id: number;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
