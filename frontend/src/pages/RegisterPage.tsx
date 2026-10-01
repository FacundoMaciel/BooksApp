import { Link, Navigate } from 'react-router';
import { useAuth } from '../auth/authContext';
import { AuthCard, Field } from '../components/AuthCard';
import { Alert, buttonStyles } from '../components/ui';
import { useAuthForm } from '../hooks/useAuthForm';

export function RegisterPage() {
  const { status, register } = useAuth();
  const { error, submitting, handleSubmit, redirectTo } = useAuthForm((form) =>
    register(String(form.get('name')), String(form.get('email')), String(form.get('password'))),
  );

  if (status === 'authenticated' && !submitting) return <Navigate to={redirectTo} replace />;

  return (
    <AuthCard
      title="Crear cuenta"
      subtitle={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" state={{ from: redirectTo }} className="font-medium text-zinc-900 underline dark:text-zinc-100">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Nombre" id="name" name="name" autoComplete="name" required autoFocus />
        <Field label="Email" id="email" name="email" type="email" autoComplete="email" required />
        <Field
          label="Contraseña"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="-mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          Mínimo 8 caracteres.
        </p>
        <button type="submit" disabled={submitting} className={`${buttonStyles.primary} mt-2 cursor-pointer`}>
          {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
        </button>
      </form>
    </AuthCard>
  );
}
