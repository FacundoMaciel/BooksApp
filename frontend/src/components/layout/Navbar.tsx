import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth } from '../../auth/authContext';
import { buttonStyles } from '../ui';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm transition-colors hover:text-zinc-900 dark:hover:text-zinc-100 ${
    isActive ? 'font-medium text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400'
  }`;

function NavLinks() {
  return (
    <>
      <NavLink to="/" end className={navLinkClass}>
        Inicio
      </NavLink>
      <NavLink to="/libros" className={navLinkClass}>
        Libros
      </NavLink>
      <NavLink to="/autores" className={navLinkClass}>
        Autores
      </NavLink>
      <NavLink to="/lista" className={navLinkClass}>
        Mi lista
      </NavLink>
    </>
  );
}

function AuthActions() {
  const { user, status, logout } = useAuth();

  if (status === 'loading') return null;
  if (user) {
    return (
      <>
        <span className="truncate px-3 py-2 text-sm text-zinc-500 dark:text-zinc-400">
          Hola, <span className="font-medium text-zinc-900 dark:text-zinc-100">{user.name}</span>
        </span>
        <button type="button" onClick={logout} className={`${buttonStyles.secondary} h-9 cursor-pointer`}>
          Cerrar sesión
        </button>
      </>
    );
  }
  return (
    <>
      <NavLink to="/login" className={navLinkClass}>
        Iniciar sesión
      </NavLink>
      <Link to="/register" className={`${buttonStyles.primary} h-9`}>
        Registrarse
      </Link>
    </>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Cierra el menú móvil al navegar.
  useEffect(() => setOpen(false), [location.pathname, location.hash]);

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-zinc-50/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <nav aria-label="Principal" className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          📚 Libros
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          <NavLinks />
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <AuthActions />
        </div>

        <button
          type="button"
          className="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-900"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
        >
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="border-t border-zinc-200 px-4 pt-2 pb-4 md:hidden dark:border-zinc-800">
          <div className="flex flex-col">
            <NavLinks />
          </div>
          <div className="mt-3 flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
            <AuthActions />
          </div>
        </div>
      )}
    </header>
  );
}
