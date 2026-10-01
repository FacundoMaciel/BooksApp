import { useState } from 'react';
import { resolveAssetUrl } from '../api/client';
import type { Book } from '../api/types';

interface BookCoverProps {
  book: Pick<Book, 'title' | 'coverUrl'>;
  className?: string;
}

/** Portada del libro. Si no tiene imagen o falla la carga, muestra un respaldo con el título. */
export function BookCover({ book, className = '' }: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const label = `Portada de ${book.title}`;

  if (!book.coverUrl || failed) {
    return (
      <div
        role="img"
        aria-label={label}
        className={`flex items-center justify-center bg-gradient-to-br from-zinc-200 to-zinc-300 p-3 text-center dark:from-zinc-800 dark:to-zinc-700 ${className}`}
      >
        <span className="line-clamp-4 text-sm font-medium text-zinc-600 dark:text-zinc-300">{book.title}</span>
      </div>
    );
  }

  return (
    <img
      src={resolveAssetUrl(book.coverUrl)}
      alt={label}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`bg-zinc-200 object-cover dark:bg-zinc-800 ${className}`}
    />
  );
}
