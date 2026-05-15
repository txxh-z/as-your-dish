import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
        <div className="h-10 w-10 rounded-full border-4 border-slate-300" />
      </div>
      <h2 className="mt-4 text-center text-lg font-semibold text-slate-950">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-6 text-slate-600">
        {description}
      </p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </section>
  );
}
