import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import { authApi } from '../api/endpoints';
import type { AuthResponse, User } from '../api/types';
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext';

const TOKEN_KEY = 'auth_token';

// localStorage puede lanzar (modo privado, almacenamiento bloqueado): la sesión
// simplemente no persiste, pero la app sigue funcionando.
const tokenStorage = {
  get: () => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* ignorado */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignorado */
    }
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => tokenStorage.get());
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStorage.get() ? 'loading' : 'anonymous'));

  // Restaura la sesión guardada validando el token contra la API.
  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return;
    let cancelled = false;
    authApi
      .me(token)
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setStatus('authenticated');
      })
      .catch((error) => {
        if (cancelled) return;
        // Solo un 401 invalida la sesión. Si la API no responde (caída o reiniciándose)
        // se conserva el token para restaurarla en la próxima carga.
        if (error instanceof ApiError && error.status === 401) {
          tokenStorage.clear();
          setToken(null);
        }
        setStatus('anonymous');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const startSession = useCallback(({ token, user }: AuthResponse) => {
    tokenStorage.set(token);
    setToken(token);
    setUser(user);
    setStatus('authenticated');
  }, []);

  const login = useCallback(
    async (email: string, password: string) => startSession(await authApi.login(email, password)),
    [startSession],
  );

  const register = useCallback(
    async (name: string, email: string, password: string) =>
      startSession(await authApi.register(name, email, password)),
    [startSession],
  );

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
    setStatus('anonymous');
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, status, login, register, logout }),
    [user, token, status, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
