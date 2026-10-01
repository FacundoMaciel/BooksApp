import { Link, Navigate } from 'react-router';
import { useAuth } from '../auth/authContext';
import { AuthCard, Field } from '../components/AuthCard';
import { Alert, buttonStyles } from '../components/ui';
import { useAuthForm } from '../hooks/useAuthForm';

export function LoginPage() {
  const { status, login } = useAuth();
  const { error, submitting, handleSubmit, redirectTo } = useAuthForm((form) =>
    login(String(form.get('email')), String(form.get('password'))),
  );

  if (status === 'authenticated' && !submitting) return <Navigate to={redirectTo} replace />;

  return (
    <AuthCard
      title="Iniciar sesión"
      subtitle={
        <>
          ¿No tienes cuenta?{' '}
          <Link to="/register" state={{ from: redirectTo }} className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Regístrate
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Email" id="email" name="email" type="email" autoComplete="email" required autoFocus />
        <Field label="Contraseña" id="password" name="password" type="password" autoComplete="current-password" required />
        <button type="submit" disabled={submitting} className={`${buttonStyles.primary} mt-2 cursor-pointer`}>
          {submitting ? 'Ingresando…' : 'Iniciar sesión'}
        </button>
      </form>
    </AuthCard>
  );
}
