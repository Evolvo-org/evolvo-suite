import type { JSX, ReactNode } from 'react';

export function Card({
  className,
  title,
  children,
}: {
  className?: string;
  title: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <section
      className={`rounded-3xl border border-zinc-800/10 bg-white shadow-sm dark:border-white/10 dark:bg-zinc-900 ${className ?? ''}`.trim()}
    >
      <div className="mb-4">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
