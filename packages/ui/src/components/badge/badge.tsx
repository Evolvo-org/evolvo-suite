import type { ReactNode } from 'react';

export interface BadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning';
}

const toneClasses: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral:
    'border-zinc-800/10 bg-zinc-900/5 text-zinc-700 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200',
  success:
    'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
  warning:
    'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
};

export const Badge = ({ children, tone = 'neutral' }: BadgeProps) => {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
};
