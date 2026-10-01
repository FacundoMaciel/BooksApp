import { Link, useLocation } from 'react-router';
import type { Book } from '../api/types';
import { useAuth } from '../auth/authContext';
import { BookCover } from '../components/BookCover';
import { Alert, Spinner, buttonStyles } from '../components/ui';
import { booksApi } from '../api/endpoints';
import { useResource } from '../hooks/useResource';

/** Extensión orientativa según la cantidad de páginas. */
function readingLength(pages: number): { label: string; className: string } {
  if (pages < 200) {
    return { label: 'Lectura corta', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' };
  }
  if (pages < 500) {
    return { label: 'Lectura media', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400' };
  }
  return { label: 'Lectura larga', className: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400' };
}

function BookCard({ book }: { book: Book }) {
  const length = readingLength(book.pages);

  return (
    <li>
      <article
        aria-labelledby={`book-${book.id}`}
        className="flex h-full flex-col rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        {/* flex-1 empuja las estadísticas al pie aunque los títulos tengan distinto largo. */}
        <div className="flex flex-1 gap-4">
          <BookCover
            book={book}
            className="aspect-[2/3] w-24 shrink-0 self-start rounded-md shadow-sm ring-1 ring-zinc-900/5 sm:w-28 dark:ring-white/10"
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <span className={`self-start rounded-full px-2 py-0.5 text-xs font-medium ${length.className}`}>
              {length.label}
            </span>
            <h2 id={`book-${book.id}`} className="mt-2 text-base font-semibold tracking-tight">
              {book.title}
            </h2>

            <p className="mt-3 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
              {book.authors.length === 1 ? 'Autor' : 'Autores'}
            </p>
            <ul className="mt-1.5 flex flex-wrap content-start items-start gap-1.5">
              {book.authors.length === 0 && <li className="text-sm text-zinc-500">Desconocido</li>}
              {book.authors.map((author) => (
                <li
                  key={author.id}
                  className="rounded-md bg-zinc-100 px-2 py-0.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {author.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-2 border-t border-zinc-100 pt-4 text-center dark:border-zinc-800">
          {[
            ['Capítulos', book.chapters],
            ['Páginas', book.pages],
            ['Pág./cap.', (book.pages / book.chapters).toFixed(2)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
              <dd className="mt-0.5 text-sm font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </article>
    </li>
  );
}

export function BooksPage() {
  const { state, retry } = useResource(booksApi.list);
  const { user } = useAuth();
  const createdBook = (useLocation().state as { createdBook?: string } | null)?.createdBook;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Libros</h1>
          <p className="mt-1 text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
            {state.status === 'success' ? `${state.data.length} libros en el catálogo` : 'Catálogo'}
          </p>
        </div>
        {/* La ruta está protegida: sin sesión, RequireAuth lleva al login y luego vuelve al formulario. */}
        <Link to="/libros/nuevo" className={`${user ? buttonStyles.primary : buttonStyles.secondary} sm:h-9 sm:px-4`}>
          {user ? '+ Agregar libro' : 'Inicia sesión para agregar'}
        </Link>
      </header>

      {createdBook && (
        <p
          role="status"
          className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400"
        >
          Se agregó «{createdBook}» al catálogo.
        </p>
      )}

      {state.status === 'loading' && (
        <div className="flex justify-center py-12">
          <Spinner label="Cargando libros…" />
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
        (state.data.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Todavía no hay libros cargados.
          </p>
        ) : (
          <ul aria-label="Libros" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {state.data.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </ul>
        ))}
    </div>
  );
}
