import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { booksApi } from '../../api/endpoints';
import { useResource } from '../../hooks/useResource';
import { BookCover } from '../BookCover';

const AUTOPLAY_MS = 3500;
const EDGE_TOLERANCE = 4;

const arrowButton =
  'absolute top-1/2 z-10 hidden size-10 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-zinc-200 bg-white/90 text-zinc-700 shadow-sm backdrop-blur transition hover:bg-white disabled:pointer-events-none disabled:opacity-0 sm:flex dark:border-zinc-700 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-900';

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d={direction === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

/** Carrusel de portadas: desliza con touch/scroll, flechas y avance automático (pausable). */
export function BooksCarousel() {
  const { state } = useResource(booksApi.list);
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [reducedMotion] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

  const books = state.status === 'success' ? state.data : [];
  const autoplay = !reducedMotion && !userPaused && !hovered && books.length > 1;

  const updateArrows = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > EDGE_TOLERANCE);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - EDGE_TOLERANCE);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    return () => window.removeEventListener('resize', updateArrows);
  }, [updateArrows, books.length]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = trackRef.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!autoplay) return;
    const id = window.setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - EDGE_TOLERANCE;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        const item = el.firstElementChild as HTMLElement | null;
        el.scrollBy({ left: (item?.offsetWidth ?? 160) + 16, behavior: 'smooth' });
      }
    }, AUTOPLAY_MS);
    return () => window.clearInterval(id);
  }, [autoplay]);

  // Si falla la API o no hay libros, la home muestra solo la bienvenida.
  if (state.status === 'error' || (state.status === 'success' && books.length === 0)) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Portadas de libros"
      className="pb-16"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onTouchStart={() => setUserPaused(true)}
    >
      <div className="relative mx-auto max-w-5xl sm:px-6">
        <button
          type="button"
          className={`${arrowButton} left-2 sm:left-0`}
          onClick={() => scrollByPage(-1)}
          disabled={!canPrev}
          aria-label="Anteriores"
        >
          <Chevron direction="left" />
        </button>

        <ul
          ref={trackRef}
          onScroll={updateArrows}
          className="flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto scroll-smooth px-4 py-2 [scrollbar-width:none] sm:scroll-px-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {state.status === 'loading'
            ? Array.from({ length: 6 }, (_, i) => (
                <li
                  key={i}
                  aria-hidden="true"
                  className="aspect-[2/3] w-32 shrink-0 animate-pulse rounded-lg bg-zinc-200 sm:w-40 lg:w-44 dark:bg-zinc-800"
                />
              ))
            : books.map((book) => (
                <li key={book.id} className="w-32 shrink-0 snap-start sm:w-40 lg:w-44">
                  <Link
                    to="/libros"
                    title={book.title}
                    className="block overflow-hidden rounded-lg shadow-sm ring-1 ring-zinc-900/5 transition hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:outline-none dark:ring-white/10 dark:focus-visible:ring-zinc-100"
                  >
                    <BookCover book={book} className="aspect-[2/3] w-full" />
                  </Link>
                </li>
              ))}
        </ul>

        <button
          type="button"
          className={`${arrowButton} right-2 sm:right-0`}
          onClick={() => scrollByPage(1)}
          disabled={!canNext}
          aria-label="Siguientes"
        >
          <Chevron direction="right" />
        </button>
      </div>

      {!reducedMotion && books.length > 1 && (
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setUserPaused((p) => !p)}
            className="cursor-pointer rounded-md px-2 py-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {userPaused ? '▶ Reanudar' : '❚❚ Pausar'}
          </button>
        </div>
      )}
    </section>
  );
}
