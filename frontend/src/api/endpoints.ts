import { apiFetch } from './client';
import type { Author, AuthorWithBooks, AuthResponse, Book, NewBook, User } from './types';

export const booksApi = {
  list: (signal?: AbortSignal) => apiFetch<Book[]>('/books', { signal }),
  create: (book: NewBook, token: string) => apiFetch<Book>('/books', { method: 'POST', body: book, token }),
};

export const authorsApi = {
  list: (signal?: AbortSignal) => apiFetch<AuthorWithBooks[]>('/authors', { signal }),
  create: (name: string, token: string) => apiFetch<Author>('/authors', { method: 'POST', body: { name }, token }),
};

export const uploadsApi = {
  /** Sube una imagen de portada y devuelve su URL (ruta relativa a la API). */
  cover: (file: File, token: string) => {
    const form = new FormData();
    form.append('cover', file);
    return apiFetch<{ url: string }>('/uploads/covers', { method: 'POST', body: form, token });
  },
};

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (name: string, email: string, password: string) =>
    apiFetch<AuthResponse>('/auth/register', { method: 'POST', body: { name, email, password } }),
  me: (token: string) => apiFetch<User>('/auth/me', { token }),
};
