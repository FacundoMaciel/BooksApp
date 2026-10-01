import type { ComponentProps } from 'react';

/** Clases compartidas para mantener un estilo consistente. */
export const buttonStyles = {
  primary:
    'inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-900/30 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 dark:focus-visible:ring-offset-zinc-950',
  secondary:
    'inline-flex h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 text-sm font-medium transition-colors hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-zinc-900/20 focus-visible:outline-none dark:border-zinc-700 dark:hover:bg-zinc-900',
};

export const inputStyles =
  'h-11 w-full min-w-0 rounded-lg border border-zinc-300 bg-white px-3 text-base shadow-xs outline-none placeholder:text-zinc-400 focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300 dark:focus:ring-zinc-300/10';

export function Spinner({ label = 'Cargando…' }: { label?: string }) {
  return (
    <span role="status" className="inline-flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
      <span className="size-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100" />
      {label}
    </span>
  );
}

export function Alert({ className = '', ...props }: ComponentProps<'p'>) {
  return (
    <p
      role="alert"
      className={`rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400 ${className}`}
      {...props}
    />
  );
}
