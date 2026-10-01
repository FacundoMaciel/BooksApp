// Sin barra final, para poder concatenar rutas como `${API_URL}/books`.
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    /** Código HTTP; 0 si no hubo respuesta (servidor caído, sin red, CORS). */
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, signal } = options;
  const headers: Record<string, string> = {};
  const isForm = body instanceof FormData;
  // Con FormData el navegador fija el Content-Type multipart con su boundary.
  if (body !== undefined && !isForm) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, 'No se pudo conectar con el servidor. ¿Está levantada la API?');
  }

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(response.status, data?.error ?? `Error ${response.status}`, data?.details);
  }
  return data as T;
}

/** Mensaje legible para mostrar en la UI, incluyendo el primer error de validación si lo hay. */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const first = Array.isArray(error.details) ? error.details[0] : undefined;
    return first?.message ?? error.message;
  }
  return 'Ocurrió un error inesperado';
}

/** Las portadas subidas se guardan como ruta relativa (`/uploads/...`) y se sirven desde la API. */
export function resolveAssetUrl(url: string): string {
  return url.startsWith('/') ? `${API_URL}${url}` : url;
}
