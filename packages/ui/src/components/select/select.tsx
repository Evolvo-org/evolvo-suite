import type { SelectHTMLAttributes } from 'react';

const selectClasses =
  'w-full rounded-xl border border-zinc-800/10 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:focus:border-zinc-200 dark:focus:ring-zinc-100/10';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = ({ className, ...props }: SelectProps) => {
  return (
    <select
      {...props}
      className={`${selectClasses} ${className ?? ''}`.trim()}
    />
  );
};
