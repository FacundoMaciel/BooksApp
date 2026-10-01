import type { ComponentProps, ReactNode } from 'react';
import { inputStyles } from './ui';

export function AuthCard({ title, subtitle, children }: { title: string; subtitle: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-sm px-4 py-12 sm:py-20">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      <div className="mt-8">{children}</div>
    </div>
  );
}

export function Field({ label, id, ...props }: ComponentProps<'input'> & { label: string; id: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input id={id} className={inputStyles} {...props} />
    </div>
  );
}
