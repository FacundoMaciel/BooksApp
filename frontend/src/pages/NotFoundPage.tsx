import { Link } from 'react-router';
import { buttonStyles } from '../components/ui';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Página no encontrada</h1>
      <Link to="/" className={`${buttonStyles.primary} mt-8`}>
        Volver al inicio
      </Link>
    </div>
  );
}
