import { AddItemForm } from '../components/AddItemForm';
import { ItemList } from '../components/ItemList';
import { useItemList } from '../hooks/useItemList';

/** Ejercicio 1: añadir y eliminar elementos de una lista. */
export function ListPage() {
  const { items, addItem, removeItem } = useItemList();

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Lista de elementos</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Añade elementos y haz click sobre uno para eliminarlo.
        </p>
      </header>

      <AddItemForm onAdd={addItem} />

      <p
        className="mt-6 mb-2 text-xs font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400"
        aria-live="polite"
      >
        {items.length === 1 ? '1 elemento' : `${items.length} elementos`}
      </p>

      <ItemList items={items} onRemove={removeItem} />
    </div>
  );
}
