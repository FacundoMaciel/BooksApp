import { useCallback, useRef, useState } from 'react';

export interface Item {
  /** Id estable para usar como `key`; el texto puede repetirse. */
  id: number;
  text: string;
}

export function useItemList(initialItems: string[] = []) {
  const nextId = useRef(initialItems.length + 1);
  const [items, setItems] = useState<Item[]>(() =>
    initialItems.map((text, index) => ({ id: index + 1, text })),
  );

  /** Añade el texto al final de la lista. Devuelve false si estaba vacío. */
  const addItem = useCallback((rawText: string): boolean => {
    const text = rawText.trim();
    if (!text) return false;
    const id = nextId.current++;
    setItems((prev) => [...prev, { id, text }]);
    return true;
  }, []);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { items, addItem, removeItem };
}
