import { useCallback, useEffect, useState } from 'react';
import { getErrorMessage } from '../api/client';

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'success'; data: T };

/** Carga un recurso de la API con estados de carga/error, cancelación y reintento. */
export function useResource<T>(fetcher: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading' });
    fetcher(controller.signal)
      .then((data) => setState({ status: 'success', data }))
      .catch((error) => {
        if (!controller.signal.aborted) setState({ status: 'error', message: getErrorMessage(error) });
      });
    return () => controller.abort();
    // `fetcher` debe ser estable (función del módulo api); se recarga solo al reintentar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, retry };
}
