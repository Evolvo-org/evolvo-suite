'use client';

import { Button } from '@repo/ui/components/button/button';

export default function GlobalErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="max-w-lg rounded-[2rem] border border-zinc-800/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-zinc-500 dark:text-zinc-400">
          Evolvo v2
        </p>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          The page hit an unexpected error. Retry once the API and web processes
          are healthy, or return to the projects dashboard if the failure
          persists.
        </p>
        <div className="mt-6">
          <Button onClick={reset} type="button">
            Try again
          </Button>
        </div>
      </div>
    </div>
  );
}
