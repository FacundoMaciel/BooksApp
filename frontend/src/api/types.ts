export interface Author {
  id: number;
  name: string;
}

export interface Book {
  id: number;
  title: string;
  chapters: number;
  pages: number;
  coverUrl: string | null;
  authors: Author[];
}

export interface AuthorWithBooks extends Author {
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
