import type { HTMLAttributes, JSX } from 'react';

export const Skeleton = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>): JSX.Element => {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-2xl bg-zinc-200/80 dark:bg-zinc-800/80 ${className ?? ''}`.trim()}
      {...props}
    />
  );
};
