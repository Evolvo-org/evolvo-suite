import Link from 'next/link';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-zinc-800/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/80">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
              Evolvo v2
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              Autonomous software factory control plane
            </h1>
          </div>
          <nav className="flex flex-wrap gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <Link
              className="hover:text-zinc-950 dark:hover:text-zinc-50"
              href="/projects"
            >
              Projects
            </Link>
            <Link
              className="hover:text-zinc-950 dark:hover:text-zinc-50"
              href="/projects/new"
            >
              Create project
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
