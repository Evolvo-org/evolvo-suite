'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';

export interface TabsItem {
  value: string;
  label: string;
  content: ReactNode;
}

export interface TabsProps {
  items: ReadonlyArray<TabsItem>;
  defaultValue?: string;
}

export const Tabs = ({ items, defaultValue }: TabsProps) => {
  const fallbackValue = items[0]?.value;
  const [activeValue, setActiveValue] = useState(
    defaultValue ?? fallbackValue ?? '',
  );

  const activeItem =
    items.find((item) => item.value === activeValue) ?? items[0] ?? null;

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-2xl border border-zinc-800/10 bg-zinc-50 p-1 dark:border-white/10 dark:bg-zinc-900">
        {items.map((item) => {
          const isActive = item.value === activeItem?.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setActiveValue(item.value)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                isActive
                  ? 'bg-white text-zinc-950 shadow-sm dark:bg-zinc-950 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div>{activeItem?.content ?? null}</div>
    </div>
  );
};
