import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, getErrorMessage } from '../api/client';
import { authorsApi, uploadsApi } from '../api/endpoints';
import type { NewAuthor } from '../api/types';
import { useAuth } from '../auth/authContext';
import { Field } from '../components/AuthCard';
import { CoverPicker } from '../components/CoverPicker';
import { Alert, buttonStyles, inputStyles } from '../components/ui';
import { useResource } from '../hooks/useResource';
import { cleanText, normalizeName } from '../utils/text';

type FieldErrors = Partial<Record<'name' | 'birthYear' | 'deathYear' | 'biography' | 'photo', string>>;

const CURRENT_YEAR = new Date().getFullYear();
const BIOGRAPHY_MAX = 1000;

function parseYear(value: string): number | null | 'invalid' {
  if (!value.trim()) return null;
  const year = Number(value);
  return Number.isInteger(year) && year > 0 && year <= CURRENT_YEAR ? year : 'invalid';
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="text-xs text-red-600 dark:text-red-400">
      {message}
    </p>
  );
}

/** Formulario para crear un autor con su información. La ruta está protegida con RequireAuth. */
export function AddAuthorPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  // Para avisar de duplicados; si falla la carga, el formulario funciona igual.
  const { state: authorsState } = useResource(authorsApi.list);

  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [deathYear, setDeathYear] = useState('');
  const [biography, setBiography] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<null | 'uploading' | 'saving'>(null);

  const validate = (): { errors: FieldErrors; birth: number | null; death: number | null } => {
    const errors: FieldErrors = {};
    const cleanName = cleanText(name);
    if (!cleanName) {
      errors.name = 'El nombre es obligatorio.';
    } else if (
      authorsState.status === 'success' &&
      authorsState.data.some((a) => normalizeName(a.name) === normalizeName(cleanName))
    ) {
      errors.name = `Ya existe un autor llamado «${cleanName}».`;
    }

    const birth = parseYear(birthYear);
    const death = parseYear(deathYear);
    const yearError = `Debe ser un año entre 1 y ${CURRENT_YEAR}.`;
    if (birth === 'invalid') errors.birthYear = yearError;
    if (death === 'invalid') errors.deathYear = yearError;
    if (typeof birth === 'number' && typeof death === 'number' && death < birth) {
      errors.deathYear = 'No puede ser anterior al año de nacimiento.';
    }
    if (biography.trim().length > BIOGRAPHY_MAX) errors.biography = `Máximo ${BIOGRAPHY_MAX} caracteres.`;

    return {
      errors,
      birth: typeof birth === 'number' ? birth : null,
      death: typeof death === 'number' ? death : null,
    };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const { errors, birth, death } = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0 || !token) return;

    try {
      let photoUrl: string | undefined;
      if (photo) {
        setSubmitting('uploading');
        photoUrl = (await uploadsApi.cover(photo, token)).url;
      }
      setSubmitting('saving');

      const data: NewAuthor = { name: cleanText(name) };
      if (cleanText(nationality)) data.nationality = cleanText(nationality);
      if (birth !== null) data.birthYear = birth;
      if (death !== null) data.deathYear = death;
      if (biography.trim()) data.biography = biography.trim();
      if (photoUrl) data.photoUrl = photoUrl;

      const author = await authorsApi.create(data, token);
      navigate('/autores', { state: { createdAuthor: author.name } });
    } catch (error) {
      // Sesión vencida: se cierra y se vuelve a este formulario tras iniciar sesión.
      if (error instanceof ApiError && error.status === 401) {
        logout();
        navigate('/login', { replace: true, state: { from: '/autores/nuevo' } });
        return;
      }
      setFormError(getErrorMessage(error));
      setSubmitting(null);
    }
  };

  const clearError = (field: keyof FieldErrors) =>
    setFieldErrors(({ [field]: _removed, ...rest }) => rest);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8">
        <Link to="/autores" className="text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100">
          ← Volver a autores
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Nuevo autor</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Solo el nombre es obligatorio; el resto de la información es opcional.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>
        {formError && <Alert>{formError}</Alert>}

        <div className="flex flex-col gap-1.5">
          <Field
            label="Nombre"
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearError('name');
            }}
            autoComplete="off"
            maxLength={120}
            aria-invalid={!!fieldErrors.name}
            aria-describedby="name-error"
            autoFocus
          />
          <FieldError id="name-error" message={fieldErrors.name} />
        </div>

        <Field
          label="Nacionalidad"
          id="nationality"
          value={nationality}
          onChange={(e) => setNationality(e.target.value)}
          placeholder="Ej.: Argentina"
          maxLength={60}
          autoComplete="off"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Field
              label="Año de nacimiento"
              id="birthYear"
              type="number"
              inputMode="numeric"
              min={1}
              max={CURRENT_YEAR}
              value={birthYear}
              onChange={(e) => {
                setBirthYear(e.target.value);
                clearError('birthYear');
              }}
              aria-invalid={!!fieldErrors.birthYear}
              aria-describedby="birthYear-error"
            />
            <FieldError id="birthYear-error" message={fieldErrors.birthYear} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Field
              label="Año de fallecimiento"
              id="deathYear"
              type="number"
              inputMode="numeric"
              min={1}
              max={CURRENT_YEAR}
              placeholder="Vacío si vive"
              value={deathYear}
              onChange={(e) => {
                setDeathYear(e.target.value);
                clearError('deathYear');
              }}
              aria-invalid={!!fieldErrors.deathYear}
              aria-describedby="deathYear-error"
            />
            <FieldError id="deathYear-error" message={fieldErrors.deathYear} />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="biography" className="text-sm font-medium">
            Biografía
          </label>
          <textarea
            id="biography"
            rows={4}
            value={biography}
            onChange={(e) => {
              setBiography(e.target.value);
              clearError('biography');
            }}
            placeholder="Breve reseña del autor y su obra"
            aria-invalid={!!fieldErrors.biography}
            aria-describedby="biography-hint biography-error"
            className={`${inputStyles} h-auto resize-y py-2`}
          />
          <p
            id="biography-hint"
            className={`text-right text-xs tabular-nums ${
              biography.trim().length > BIOGRAPHY_MAX ? 'text-red-600 dark:text-red-400' : 'text-zinc-500 dark:text-zinc-400'
            }`}
          >
            {biography.trim().length}/{BIOGRAPHY_MAX}
          </p>
          <FieldError id="biography-error" message={fieldErrors.biography} />
        </div>

        <CoverPicker
          label="Foto"
          inputLabel="Foto del autor"
          shape="photo"
          file={photo}
          error={fieldErrors.photo}
          onChange={(file, error) => {
            setPhoto(file);
            setFieldErrors(({ photo: _photo, ...rest }) => (error ? { ...rest, photo: error } : rest));
          }}
        />

        <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Link to="/autores" className={buttonStyles.secondary}>
            Cancelar
          </Link>
          <button type="submit" disabled={submitting !== null} className={`${buttonStyles.primary} cursor-pointer`}>
            {submitting === 'uploading' ? 'Subiendo foto…' : submitting === 'saving' ? 'Guardando…' : 'Guardar autor'}
          </button>
        </div>
      </form>
    </div>
  );
}
