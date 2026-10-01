import { Link } from 'react-router';
import { useAuth } from '../../auth/authContext';
import { buttonStyles } from '../ui';

export function WelcomeSection() {
  const { user } = useAuth();

  return (
    <section aria-labelledby="welcome-title" className="mx-auto max-w-5xl px-4 pt-16 pb-12 sm:px-6 sm:pt-24 sm:pb-16">
      <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">Bienvenida</p>
      <h1 id="welcome-title" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-balance sm:text-5xl">
        {user ? `Hola de nuevo, ${user.name}.` : 'Tu biblioteca, simple y ordenada.'}
      </h1>
      <p className="mt-4 max-w-xl text-base text-zinc-600 sm:text-lg dark:text-zinc-400">
        Explora los libros disponibles con sus autores y el promedio de páginas por capítulo, y lleva tu propia lista
        de elementos.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {user ? (
          <>
            <Link to="/libros" className={buttonStyles.primary}>
              Ver libros
            </Link>
            <Link to="/lista" className={buttonStyles.secondary}>
              Ir a mi lista
            </Link>
          </>
        ) : (
          <>
            <Link to="/register" className={buttonStyles.primary}>
              Crear cuenta
            </Link>
            <Link to="/login" className={buttonStyles.secondary}>
              Iniciar sesión
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
