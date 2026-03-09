'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

export interface SheetProps {
  triggerLabel: string;
  title: string;
  description?: string;
  children: ReactNode;
  side?: 'left' | 'right';
}

const sideClasses: Record<NonNullable<SheetProps['side']>, string> = {
  left: 'mr-auto',
  right: 'ml-auto',
};

export const Sheet = ({
  triggerLabel,
  title,
  description,
  children,
  side = 'right',
}: SheetProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-xl border border-zinc-800/10 bg-white px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
      >
        {triggerLabel}
      </button>
      {isOpen ? (
        <div className="fixed inset-0 z-50 flex bg-zinc-950/60">
          <div
            className={`${sideClasses[side]} h-full w-full max-w-xl overflow-y-auto border-l border-zinc-800/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-zinc-950`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                {description ? (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    {description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full p-2 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-950 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                aria-label="Close sheet"
              >
                ×
              </button>
            </div>
            <div className="mt-6">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
};
