import { Link } from 'react-router';
import { useAuth } from '../../auth/authContext';

const linkClass = 'text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100';

export function Footer() {
  const { user, logout } = useAuth();

  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          © {new Date().getFullYear()} Libros · Prueba técnica React + Node.js
        </p>
        <nav aria-label="Pie de página">
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <li>
              <Link to="/" className={linkClass}>
                Inicio
              </Link>
            </li>
            <li>
              <Link to="/libros" className={linkClass}>
                Libros
              </Link>
            </li>
            <li>
              <Link to="/autores" className={linkClass}>
                Autores
              </Link>
            </li>
            <li>
              <Link to="/lista" className={linkClass}>
                Mi lista
              </Link>
            </li>
            {user ? (
              <li>
                <button type="button" onClick={logout} className={`${linkClass} cursor-pointer`}>
                  Cerrar sesión
                </button>
              </li>
            ) : (
              <>
                <li>
                  <Link to="/login" className={linkClass}>
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link to="/register" className={linkClass}>
                    Registrarse
                  </Link>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
