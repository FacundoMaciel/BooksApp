import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { resolveAssetUrl } from '../api/client';
import { authorsApi } from '../api/endpoints';
import type { AuthorWithBooks } from '../api/types';
import { useAuth } from '../auth/authContext';
import { BookCover } from '../components/BookCover';
import { Alert, Spinner, buttonStyles } from '../components/ui';
import { useResource } from '../hooks/useResource';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');

const plural = (n: number, singular: string, pluralForm: string) => `${n} ${n === 1 ? singular : pluralForm}`;

/** "1914 – 1984", "n. 1942" o null si no hay años. */
function lifeSpan({ birthYear, deathYear }: Pick<AuthorWithBooks, 'birthYear' | 'deathYear'>): string | null {
  if (birthYear && deathYear) return `${birthYear} – ${deathYear}`;
  if (birthYear) return `n. ${birthYear}`;
  if (deathYear) return `m. ${deathYear}`;
  return null;
}

/** Foto del autor; si no tiene o no carga, muestra sus iniciales. */
function AuthorAvatar({ author }: { author: AuthorWithBooks }) {
  const [failed, setFailed] = useState(false);
  const base = 'flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full';

  if (author.photoUrl && !failed) {
    return (
      <img
        src={resolveAssetUrl(author.photoUrl)}
        alt={`Foto de ${author.name}`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${base} bg-zinc-200 object-cover dark:bg-zinc-800`}
      />
    );
  }
  return (
    <span aria-hidden="true" className={`${base} bg-zinc-900 text-base font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900`}>
      {initials(author.name)}
    </span>
  );
}

function AuthorCard({ author }: { author: AuthorWithBooks }) {
  const totalPages = author.books.reduce((sum, book) => sum + book.pages, 0);
  const details = [author.nationality, lifeSpan(author)].filter(Boolean).join(' · ');

  return (
    <li>
      <article
        aria-labelledby={`author-${author.id}`}
        className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <header className="flex items-center gap-4">
          <AuthorAvatar author={author} />
          <div className="min-w-0">
            <h2 id={`author-${author.id}`} className="font-semibold tracking-tight">
              {author.name}
            </h2>
            {details && <p className="text-sm text-zinc-600 dark:text-zinc-300">{details}</p>}
            <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
              {plural(author.books.length, 'libro', 'libros')}
              {totalPages > 0 && ` · ${totalPages.toLocaleString('es')} páginas`}
            </p>
          </div>
        </header>

        {author.biography && (
          <p className="mt-4 line-clamp-4 text-sm text-zinc-600 dark:text-zinc-400" title={author.biography}>
            {author.biography}
          </p>
        )}

        {author.books.length === 0 ? (
          <p className="mt-5 text-sm text-zinc-500 dark:text-zinc-400">Todavía no tiene libros cargados.</p>
        ) : (
          <ul aria-label={`Libros de ${author.name}`} className="mt-5 flex flex-col gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            {author.books.map((book) => (
              <li key={book.id} className="flex items-center gap-3">
                <BookCover book={book} className="aspect-[2/3] w-9 shrink-0 rounded text-[8px]" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{book.title}</p>
                  <p className="text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                    {plural(book.chapters, 'capítulo', 'capítulos')} · {book.pages} pág.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </article>
    </li>
  );
}

export function AuthorsPage() {
  const { state, retry } = useResource(authorsApi.list);
  const { user } = useAuth();
  const createdAuthor = (useLocation().state as { createdAuthor?: string } | null)?.createdAuthor;
  const authors =
    state.status === 'success' ? [...state.data].sort((a, b) => a.name.localeCompare(b.name, 'es')) : [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Autores</h1>
          <p className="mt-1 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
            {state.status === 'success' ? plural(authors.length, 'autor', 'autores') : 'Catálogo de autores'}
          </p>
        </div>
        {/* La ruta está protegida: sin sesión, RequireAuth lleva al login y luego vuelve al formulario. */}
        <Link to="/autores/nuevo" className={`${user ? buttonStyles.primary : buttonStyles.secondary} sm:h-9 sm:px-4`}>
          {user ? '+ Nuevo autor' : 'Inicia sesión para agregar'}
        </Link>
      </header>

      {createdAuthor && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
        >
          Se agregó «{createdAuthor}». Ya podés asignarlo al{' '}
          <Link to="/libros/nuevo" className="font-medium underline">
            crear un libro
          </Link>
          .
        </p>
      )}

      {state.status === 'loading' && (
        <div className="flex justify-center py-12">
          <Spinner label="Cargando autores…" />
        </div>
      )}

      {state.status === 'error' && (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <Alert className="flex-1">{state.message}</Alert>
          <button type="button" onClick={retry} className={`${buttonStyles.secondary} cursor-pointer`}>
            Reintentar
          </button>
        </div>
      )}

      {state.status === 'success' &&
        (authors.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Todavía no hay autores cargados.
          </p>
        ) : (
          <ul aria-label="Autores" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {authors.map((author) => (
              <AuthorCard key={author.id} author={author} />
            ))}
          </ul>
        ))}
    </div>
  );
}
