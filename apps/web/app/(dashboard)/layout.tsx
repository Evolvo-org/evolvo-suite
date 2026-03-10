import Link from 'next/link';
import type { ReactNode } from 'react';

import { getOptionalCurrentUser } from '../../src/features/auth/lib/server-auth';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const currentUser = await getOptionalCurrentUser();
  const canCreateProject = currentUser?.capabilities.includes('projects:write');

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8">
        <header className="mb-8 flex flex-col gap-4 rounded-3xl border border-zinc-800/10 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-white/10 dark:bg-zinc-900/80">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                Evolvo v2
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                Autonomous software factory control plane
              </h1>
            </div>
            {currentUser ? (
              <div className="rounded-2xl border border-zinc-900/10 bg-zinc-50 px-4 py-3 text-sm dark:border-white/10 dark:bg-zinc-950">
                <p className="font-semibold">
                  {currentUser.displayName ?? currentUser.userId}
                </p>
                <p className="text-zinc-600 dark:text-zinc-400">
                  {currentUser.role} · {currentUser.workspaceKey}
                </p>
                <form action="/api/auth/logout" method="post" className="mt-3">
                  <button
                    className="text-sm font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50"
                    type="submit"
                  >
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
          <nav className="flex flex-wrap gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            <Link
              className="hover:text-zinc-950 dark:hover:text-zinc-50"
              href="/dashboard"
            >
              Dashboard
            </Link>
            <Link
              className="hover:text-zinc-950 dark:hover:text-zinc-50"
              href="/projects"
            >
              Projects
            </Link>
            {canCreateProject ? (
              <Link
                className="hover:text-zinc-950 dark:hover:text-zinc-50"
                href="/projects/new"
              >
                Create project
              </Link>
            ) : null}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
