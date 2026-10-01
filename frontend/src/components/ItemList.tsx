import type { Item } from '../hooks/useItemList';

interface ItemListProps {
  items: Item[];
  onRemove: (id: number) => void;
}

export function ItemList({ items, onRemove }: ItemListProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-zinc-300 px-4 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        La lista está vacía. Añade tu primer elemento.
      </p>
    );
  }

  return (
    <ul
      className="divide-y divide-zinc-200 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900"
      aria-label="Elementos"
    >
      {items.map((item) => (
        <li key={item.id}>
          {/* Un <button> hace el elemento accesible por teclado (Tab + Enter/Espacio). */}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={`Eliminar ${item.text}`}
            title="Haz click para eliminar"
            className="group flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-red-50 focus-visible:bg-red-50 focus-visible:outline-none dark:hover:bg-red-950/40 dark:focus-visible:bg-red-950/40"
          >
            <span className="min-w-0 break-words group-hover:text-red-700 group-hover:line-through group-focus-visible:text-red-700 group-focus-visible:line-through dark:group-hover:text-red-400 dark:group-focus-visible:text-red-400">
              {item.text}
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-zinc-400 transition-colors group-hover:text-red-600 group-focus-visible:text-red-600 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100"
            >
              ✕
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
