import { useEffect, useId, useState, type DragEvent } from 'react';

export const ACCEPTED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_COVER_MB = 2;

/** Devuelve un mensaje de error si el archivo no es una portada válida. */
export function validateCoverFile(file: File): string | null {
  if (!ACCEPTED_COVER_TYPES.includes(file.type)) return 'La imagen debe ser JPG, PNG, WEBP o GIF.';
  if (file.size > MAX_COVER_MB * 1024 * 1024) return `La imagen no puede superar ${MAX_COVER_MB} MB.`;
  return null;
}

interface CoverPickerProps {
  file: File | null;
  onChange: (file: File | null, error: string | null) => void;
  error?: string;
}

/** Selector de imagen de portada con vista previa; admite click o arrastrar y soltar. */
export function CoverPicker({ file, onChange, error }: CoverPickerProps) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // URL temporal para la vista previa; se libera al cambiar de archivo o desmontar.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const select = (selected: File | undefined) => {
    if (!selected) return;
    const message = validateCoverFile(selected);
    onChange(message ? null : selected, message);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    select(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">Portada</span>
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer items-center gap-4 rounded-lg border border-dashed p-3 transition-colors focus-within:ring-2 focus-within:ring-zinc-900/20 ${
          error
            ? 'border-red-400 dark:border-red-700'
            : dragging
              ? 'border-zinc-900 bg-zinc-100 dark:border-zinc-100 dark:bg-zinc-800'
              : 'border-zinc-300 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900'
        }`}
      >
        <div className="flex aspect-[2/3] w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-200 dark:bg-zinc-800">
          {preview ? (
            <img src={preview} alt="Vista previa de la portada" className="size-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" className="size-6 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          )}
        </div>
        <div className="min-w-0 text-sm">
          <p className="font-medium">{file ? 'Cambiar imagen' : 'Seleccionar imagen'}</p>
          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
            {file ? file.name : `o arrástrala aquí · JPG, PNG, WEBP o GIF · máx. ${MAX_COVER_MB} MB`}
          </p>
        </div>
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_COVER_TYPES.join(',')}
          className="sr-only"
          aria-label="Imagen de portada"
          aria-invalid={!!error}
          aria-describedby="cover-error"
          onChange={(e) => {
            select(e.target.files?.[0]);
            // Permite volver a elegir el mismo archivo tras un error.
            e.target.value = '';
          }}
        />
      </label>
      {error && (
        <p id="cover-error" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
