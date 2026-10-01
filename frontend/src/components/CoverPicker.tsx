import { useEffect, useId, useRef, useState, type DragEvent } from 'react';
import { ACCEPTED_IMAGE_TYPES, prepareImage } from '../utils/image';

interface CoverPickerProps {
  file: File | null;
  onChange: (file: File | null, error: string | null) => void;
  error?: string;
  /** Título visible del campo. */
  label?: string;
  /** Nombre accesible del input de archivo. */
  inputLabel?: string;
  /** 'cover': rectangular 2:3 (portadas). 'photo': cuadrada y redonda (fotos de autor). */
  shape?: 'cover' | 'photo';
}

/** Selector de imagen de portada con vista previa; admite click o arrastrar y soltar. */
export function CoverPicker({
  file,
  onChange,
  error,
  label = 'Portada',
  inputLabel = 'Imagen de portada',
  shape = 'cover',
}: CoverPickerProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
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

  const [processing, setProcessing] = useState(false);
  // Evita que una selección vieja (más lenta de procesar) pise a una más nueva.
  const lastSelection = useRef(0);

  const select = async (selected: File | undefined) => {
    if (!selected) return;
    const selection = ++lastSelection.current;
    setProcessing(true);
    const result = await prepareImage(selected);
    if (selection !== lastSelection.current) return;
    setProcessing(false);
    onChange(result.file ?? null, result.error ?? null);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    void select(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
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
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden bg-zinc-200 dark:bg-zinc-800 ${
            shape === 'photo' ? 'size-16 rounded-full' : 'aspect-[2/3] w-16 rounded-md'
          }`}
        >
          {preview ? (
            <img src={preview} alt={`Vista previa: ${label.toLowerCase()}`} className="size-full object-cover" />
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
            {processing
              ? 'Preparando imagen…'
              : file
                ? file.name
                : 'o arrástrala aquí · JPG, PNG, WEBP o GIF (las fotos grandes se achican solas)'}
          </p>
        </div>
        <input
          id={inputId}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          className="sr-only"
          aria-label={inputLabel}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          onChange={(e) => {
            void select(e.target.files?.[0]);
            // Permite volver a elegir el mismo archivo. Es seguro: prepareImage ya copió el contenido.
            e.target.value = '';
          }}
        />
      </label>
      {error && (
        <p id={errorId} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
