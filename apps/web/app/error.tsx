'use client';

export default function GlobalErrorBoundary({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 dark:bg-zinc-950">
      <div className="max-w-md rounded-3xl border border-zinc-800/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          The page hit an unexpected error. Retry once the API and web processes
          are healthy.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 rounded-xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
