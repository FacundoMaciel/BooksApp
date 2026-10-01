import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getErrorMessage } from '../api/client';

/** Maneja envío, error y redirección post-login comunes a los formularios de auth. */
export function useAuthForm(action: (form: FormData) => Promise<void>) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? '/';

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await action(new FormData(event.currentTarget));
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return { error, submitting, handleSubmit, redirectTo };
}
