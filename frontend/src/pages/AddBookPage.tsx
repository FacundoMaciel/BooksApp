import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, getErrorMessage } from '../api/client';
import { authorsApi, booksApi, uploadsApi } from '../api/endpoints';
import type { Author } from '../api/types';
import { useAuth } from '../auth/authContext';
import { Field } from '../components/AuthCard';
import { CoverPicker } from '../components/CoverPicker';
import { Alert, Spinner, buttonStyles, inputStyles } from '../components/ui';

type FieldErrors = Partial<Record<'title' | 'chapters' | 'pages' | 'cover' | 'authors', string>>;

const isPositiveInt = (value: string) => /^\d+$/.test(value) && Number(value) > 0;

function validate(title: string, chapters: string, pages: string, cover: File | null, authorIds: number[]): FieldErrors {
  const errors: FieldErrors = {};
  if (!title.trim()) errors.title = 'El título es obligatorio.';
  if (!isPositiveInt(chapters)) errors.chapters = 'Debe ser un número entero mayor a 0.';
  if (!isPositiveInt(pages)) errors.pages = 'Debe ser un número entero mayor a 0.';
  if (!cover) errors.cover = 'La portada es obligatoria.';
  if (authorIds.length === 0) errors.authors = 'Selecciona al menos un autor.';
  return errors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

/** Formulario para crear un libro. La ruta está protegida con RequireAuth. */
export function AddBookPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [chapters, setChapters] = useState('');
  const [pages, setPages] = useState('');
  const [cover, setCover] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  /** null = sin enviar; si no, la etapa actual del guardado. */
  const [submitting, setSubmitting] = useState<null | 'uploading' | 'saving'>(null);

  const [authors, setAuthors] = useState<Author[] | null>(null);
  const [authorsError, setAuthorsError] = useState<string | null>(null);
  const [newAuthor, setNewAuthor] = useState('');
  const [creatingAuthor, setCreatingAuthor] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    authorsApi
      .list(controller.signal)
      .then(setAuthors)
      .catch((error) => {
        if (!controller.signal.aborted) setAuthorsError(getErrorMessage(error));
      });
    return () => controller.abort();
  }, []);

  /** Ante un 401 (token expirado) se cierra la sesión y se pide volver a entrar. */
  const handleApiError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      logout();
      navigate('/login', { replace: true, state: { from: '/libros/nuevo' } });
      return;
    }
    setFormError(getErrorMessage(error));
  };

  const toggleAuthor = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setFieldErrors(({ authors: _authors, ...rest }) => rest);
  };

  const handleCreateAuthor = async () => {
    const name = newAuthor.trim();
    if (!name || !token) return;
    setCreatingAuthor(true);
    setFormError(null);
    try {
      const author = await authorsApi.create(name, token);
      setAuthors((prev) => [...(prev ?? []), author]);
      toggleAuthor(author.id);
      setNewAuthor('');
    } catch (error) {
      handleApiError(error);
    } finally {
      setCreatingAuthor(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const errors = validate(title, chapters, pages, cover, selectedIds);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !token || !cover) return;

    try {
      // Primero se sube la imagen y luego se crea el libro con la URL obtenida.
      setSubmitting('uploading');
      const { url: coverUrl } = await uploadsApi.cover(cover, token);
      setSubmitting('saving');
      const book = await booksApi.create(
        { title: title.trim(), chapters: Number(chapters), pages: Number(pages), coverUrl, authorIds: selectedIds },
        token,
      );
      navigate('/libros', { state: { createdBook: book.title } });
    } catch (error) {
      handleApiError(error);
      setSubmitting(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8">
        <Link to="/libros" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          ← Volver a libros
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Agregar libro</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Completa los datos, sube la portada y selecciona sus autores.</p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {formError && <Alert>{formError}</Alert>}

        <div className="flex flex-col gap-1.5">
          <Field
            label="Título"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            aria-invalid={!!fieldErrors.title}
            aria-describedby="title-error"
            autoFocus
          />
          <FieldError id="title-error" message={fieldErrors.title} />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Field
              label="Capítulos"
              id="chapters"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={chapters}
              onChange={(e) => setChapters(e.target.value)}
              aria-invalid={!!fieldErrors.chapters}
              aria-describedby="chapters-error"
            />
            <FieldError id="chapters-error" message={fieldErrors.chapters} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Field
              label="Páginas"
              id="pages"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={pages}
              onChange={(e) => setPages(e.target.value)}
              aria-invalid={!!fieldErrors.pages}
              aria-describedby="pages-error"
            />
            <FieldError id="pages-error" message={fieldErrors.pages} />
          </div>
        </div>

        <CoverPicker
          file={cover}
          error={fieldErrors.cover}
          onChange={(file, error) => {
            setCover(file);
            setFieldErrors(({ cover: _cover, ...rest }) => (error ? { ...rest, cover: error } : rest));
          }}
        />

        <fieldset className="flex flex-col gap-3" aria-describedby="authors-error">
          <legend className="mb-1.5 text-sm font-medium">Autores</legend>

          {authorsError && <Alert>{authorsError}</Alert>}
          {!authors && !authorsError && <Spinner label="Cargando autores…" />}
          {authors && authors.length === 0 && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No hay autores todavía. Crea uno abajo.</p>
          )}
          {authors && authors.length > 0 && (
            <div className="grid max-h-60 gap-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-2 sm:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900">
              {authors.map((author) => (
                <label
                  key={author.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(author.id)}
                    onChange={() => toggleAuthor(author.id)}
                    className="size-4 accent-zinc-900 dark:accent-zinc-100"
                  />
                  {author.name}
                </label>
              ))}
            </div>
          )}
          <FieldError id="authors-error" message={fieldErrors.authors} />

          <div className="flex flex-col gap-2 sm:flex-row">
            <label htmlFor="new-author" className="sr-only">
              Nuevo autor
            </label>
            <input
              id="new-author"
              value={newAuthor}
              onChange={(e) => setNewAuthor(e.target.value)}
              // Enter crea el autor en lugar de enviar el formulario del libro.
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void handleCreateAuthor();
                }
              }}
              placeholder="¿No está? Escribe el nombre del autor"
              className={`${inputStyles} flex-1`}
            />
            <button
              type="button"
              onClick={handleCreateAuthor}
              disabled={!newAuthor.trim() || creatingAuthor}
              className={`${buttonStyles.secondary} cursor-pointer disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {creatingAuthor ? 'Creando…' : 'Crear autor'}
            </button>
          </div>
        </fieldset>

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to="/libros" className={buttonStyles.secondary}>
            Cancelar
          </Link>
          <button type="submit" disabled={submitting !== null} className={`${buttonStyles.primary} cursor-pointer`}>
            {submitting === 'uploading' ? 'Subiendo portada…' : submitting === 'saving' ? 'Guardando…' : 'Guardar libro'}
          </button>
        </div>
      </form>
    </div>
  );
}
