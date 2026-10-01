import { useRef, useState, type FormEvent } from 'react';

interface AddItemFormProps {
  onAdd: (text: string) => boolean;
}

export function AddItemForm({ onAdd }: AddItemFormProps) {
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const isEmpty = text.trim() === '';

  // Usar un <form> permite añadir también con la tecla Enter.
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (onAdd(text)) {
      setText('');
    }
    // Se devuelve el foco al campo para poder cargar varios elementos seguidos.
    inputRef.current?.focus();
  };

  return (
    <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleSubmit}>
      <label htmlFor="new-item" className="sr-only">
        Nuevo elemento
      </label>
      <input
        id="new-item"
        ref={inputRef}
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Escribe un elemento…"
        autoComplete="off"
        autoFocus
        className="h-11 min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-base shadow-xs outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/10"
      />
      <button
        type="submit"
        disabled={isEmpty}
        className="h-11 shrink-0 cursor-pointer rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-900/30 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:ring-offset-zinc-950 dark:disabled:hover:bg-zinc-100"
      >
        Añadir
      </button>
    </form>
  );
}
