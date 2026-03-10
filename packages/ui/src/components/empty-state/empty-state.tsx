import type { JSX, ReactNode } from 'react';

export const EmptyState = ({
  action,
  className,
  description,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description: string;
  title: string;
}): JSX.Element => {
  return (
    <div
      className={`rounded-3xl border border-dashed border-zinc-800/15 bg-zinc-50/80 p-6 dark:border-white/10 dark:bg-zinc-950/50 ${className ?? ''}`.trim()}
    >
      <h3 className="text-base font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        {title}
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
};
