'use client';

import { Button } from '@repo/ui/components/button/button';

export default function ProjectError({
  reset,
}: {
  reset: () => void;
}) {
  return (
    <div className="rounded-[2rem] border border-zinc-800/10 bg-white p-8 shadow-sm dark:border-white/10 dark:bg-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Project route failed to render
      </h1>
      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
        The page hit an unexpected runtime or server error. Retry once the API
        and project data are healthy again.
      </p>
      <div className="mt-6">
        <Button onClick={reset} type="button">
          Retry route
        </Button>
      </div>
    </div>
  );
}
